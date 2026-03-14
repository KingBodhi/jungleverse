#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <cmath>
#include <algorithm>
#include <numeric>
#include <mutex>
#include <shared_mutex>

namespace nlhe {

// Data for a single information set (thread-safe for OpenMP)
class InfoSetData {
public:
    InfoSetData(size_t num_actions)
        : num_actions_(num_actions),
          cumulative_regret_(num_actions, 0.0f),
          cumulative_strategy_(num_actions, 0.0f),
          locked_(false),
          locked_strategy_(num_actions, 0.0f) {}

    // Copy constructor for thread-safe copying
    InfoSetData(const InfoSetData& other) {
        std::lock_guard<std::mutex> lock(other.mutex_);
        num_actions_ = other.num_actions_;
        cumulative_regret_ = other.cumulative_regret_;
        cumulative_strategy_ = other.cumulative_strategy_;
        locked_ = other.locked_;
        locked_strategy_ = other.locked_strategy_;
    }

    // Move constructor
    InfoSetData(InfoSetData&& other) noexcept {
        std::lock_guard<std::mutex> lock(other.mutex_);
        num_actions_ = other.num_actions_;
        cumulative_regret_ = std::move(other.cumulative_regret_);
        cumulative_strategy_ = std::move(other.cumulative_strategy_);
        locked_ = other.locked_;
        locked_strategy_ = std::move(other.locked_strategy_);
    }

    size_t num_actions() const { return num_actions_; }

    // Get current strategy via regret matching
    std::vector<float> get_strategy() const {
        if (locked_) {
            return locked_strategy_;
        }

        std::vector<float> strategy(num_actions_);
        float sum = 0.0f;

        for (size_t i = 0; i < num_actions_; ++i) {
            strategy[i] = std::max(cumulative_regret_[i], 0.0f);
            sum += strategy[i];
        }

        if (sum > 0) {
            for (size_t i = 0; i < num_actions_; ++i) {
                strategy[i] /= sum;
            }
        } else {
            // Uniform if all regrets non-positive
            float uniform = 1.0f / num_actions_;
            std::fill(strategy.begin(), strategy.end(), uniform);
        }

        return strategy;
    }

    // Get average strategy (converges to Nash)
    std::vector<float> get_average_strategy() const {
        std::vector<float> strategy(num_actions_);
        float sum = std::accumulate(cumulative_strategy_.begin(),
                                    cumulative_strategy_.end(), 0.0f);

        if (sum > 0) {
            for (size_t i = 0; i < num_actions_; ++i) {
                strategy[i] = cumulative_strategy_[i] / sum;
            }
        } else {
            float uniform = 1.0f / num_actions_;
            std::fill(strategy.begin(), strategy.end(), uniform);
        }

        return strategy;
    }

    // Update cumulative regret (CFR+ with flooring) - thread-safe
    void update_regret(const std::vector<float>& regrets) {
        if (locked_) return;

        std::lock_guard<std::mutex> lock(mutex_);
        for (size_t i = 0; i < num_actions_; ++i) {
            cumulative_regret_[i] += regrets[i];
            // CFR+ flooring: clamp to 0
            cumulative_regret_[i] = std::max(cumulative_regret_[i], 0.0f);
        }
    }

    // Update cumulative strategy (weighted by reach probability) - thread-safe
    void update_strategy(const std::vector<float>& strategy, float reach_prob) {
        if (locked_) return;

        std::lock_guard<std::mutex> lock(mutex_);
        for (size_t i = 0; i < num_actions_; ++i) {
            cumulative_strategy_[i] += reach_prob * strategy[i];
        }
    }

    // Node locking
    bool is_locked() const { return locked_; }

    void lock(const std::vector<float>& strategy) {
        locked_ = true;
        locked_strategy_ = strategy;
    }

    void unlock() {
        locked_ = false;
        // Reset regrets for re-solving
        std::fill(cumulative_regret_.begin(), cumulative_regret_.end(), 0.0f);
    }

    // Reset for re-solving (but keep locked state)
    void reset_regrets() {
        if (!locked_) {
            std::fill(cumulative_regret_.begin(), cumulative_regret_.end(), 0.0f);
        }
    }

    // Access raw data (for persistence)
    const std::vector<float>& cumulative_regret() const { return cumulative_regret_; }
    const std::vector<float>& cumulative_strategy() const { return cumulative_strategy_; }
    const std::vector<float>& locked_strategy() const { return locked_strategy_; }

private:
    size_t num_actions_;
    std::vector<float> cumulative_regret_;
    std::vector<float> cumulative_strategy_;
    bool locked_;
    std::vector<float> locked_strategy_;
    mutable std::mutex mutex_;  // For thread-safe updates
};

// Store for all information sets (thread-safe for OpenMP)
class InfoSetStore {
public:
    InfoSetStore() = default;

    // Get or create info set - thread-safe
    InfoSetData& get_or_create(const std::string& key, size_t num_actions) {
        // First try read lock (fast path if key exists)
        {
            std::shared_lock<std::shared_mutex> read_lock(mutex_);
            auto it = store_.find(key);
            if (it != store_.end()) {
                return it->second;
            }
        }
        // Need to create - use exclusive lock
        std::unique_lock<std::shared_mutex> write_lock(mutex_);
        // Double-check after acquiring write lock
        auto it = store_.find(key);
        if (it != store_.end()) {
            return it->second;
        }
        auto [inserted, success] = store_.emplace(key, InfoSetData(num_actions));
        return inserted->second;
    }

    // Get existing info set (returns nullptr if not found) - thread-safe
    InfoSetData* get(const std::string& key) {
        std::shared_lock<std::shared_mutex> read_lock(mutex_);
        auto it = store_.find(key);
        return it != store_.end() ? &it->second : nullptr;
    }

    const InfoSetData* get(const std::string& key) const {
        std::shared_lock<std::shared_mutex> read_lock(mutex_);
        auto it = store_.find(key);
        return it != store_.end() ? &it->second : nullptr;
    }

    // Check if key exists - thread-safe
    bool contains(const std::string& key) const {
        std::shared_lock<std::shared_mutex> lock(mutex_);
        return store_.find(key) != store_.end();
    }

    // Number of info sets - thread-safe
    size_t size() const {
        std::shared_lock<std::shared_mutex> lock(mutex_);
        return store_.size();
    }

    // Iterate over all info sets (NOT thread-safe - caller must ensure no concurrent modification)
    auto begin() { return store_.begin(); }
    auto end() { return store_.end(); }
    auto begin() const { return store_.begin(); }
    auto end() const { return store_.end(); }

    // Reset all regrets (for re-solving after locks) - thread-safe
    void reset_all_regrets() {
        std::unique_lock<std::shared_mutex> lock(mutex_);
        for (auto& [key, data] : store_) {
            data.reset_regrets();
        }
    }

    // Get all keys - thread-safe
    std::vector<std::string> keys() const {
        std::shared_lock<std::shared_mutex> lock(mutex_);
        std::vector<std::string> result;
        result.reserve(store_.size());
        for (const auto& [key, _] : store_) {
            result.push_back(key);
        }
        return result;
    }

    // Clear all data
    void clear() {
        std::unique_lock<std::shared_mutex> lock(mutex_);
        store_.clear();
    }

private:
    std::unordered_map<std::string, InfoSetData> store_;
    mutable std::shared_mutex mutex_;  // Reader-writer lock for thread safety
};

}  // namespace nlhe
