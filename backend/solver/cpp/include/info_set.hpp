#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <cmath>
#include <algorithm>
#include <numeric>

namespace nlhe {

// Data for a single information set
class InfoSetData {
public:
    InfoSetData(size_t num_actions)
        : num_actions_(num_actions),
          cumulative_regret_(num_actions, 0.0f),
          cumulative_strategy_(num_actions, 0.0f),
          locked_(false),
          locked_strategy_(num_actions, 0.0f) {}

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

    // Update cumulative regret (CFR+ with flooring)
    void update_regret(const std::vector<float>& regrets) {
        if (locked_) return;

        for (size_t i = 0; i < num_actions_; ++i) {
            cumulative_regret_[i] += regrets[i];
            // CFR+ flooring: clamp to 0
            cumulative_regret_[i] = std::max(cumulative_regret_[i], 0.0f);
        }
    }

    // Update cumulative strategy (weighted by reach probability)
    void update_strategy(const std::vector<float>& strategy, float reach_prob) {
        if (locked_) return;

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
};

// Store for all information sets
class InfoSetStore {
public:
    InfoSetStore() = default;

    // Get or create info set
    InfoSetData& get_or_create(const std::string& key, size_t num_actions) {
        auto it = store_.find(key);
        if (it == store_.end()) {
            auto [inserted, success] = store_.emplace(key, InfoSetData(num_actions));
            return inserted->second;
        }
        return it->second;
    }

    // Get existing info set (returns nullptr if not found)
    InfoSetData* get(const std::string& key) {
        auto it = store_.find(key);
        return it != store_.end() ? &it->second : nullptr;
    }

    const InfoSetData* get(const std::string& key) const {
        auto it = store_.find(key);
        return it != store_.end() ? &it->second : nullptr;
    }

    // Check if key exists
    bool contains(const std::string& key) const {
        return store_.find(key) != store_.end();
    }

    // Number of info sets
    size_t size() const { return store_.size(); }

    // Iterate over all info sets
    auto begin() { return store_.begin(); }
    auto end() { return store_.end(); }
    auto begin() const { return store_.begin(); }
    auto end() const { return store_.end(); }

    // Reset all regrets (for re-solving after locks)
    void reset_all_regrets() {
        for (auto& [key, data] : store_) {
            data.reset_regrets();
        }
    }

    // Get all keys
    std::vector<std::string> keys() const {
        std::vector<std::string> result;
        result.reserve(store_.size());
        for (const auto& [key, _] : store_) {
            result.push_back(key);
        }
        return result;
    }

    // Clear all data
    void clear() { store_.clear(); }

private:
    std::unordered_map<std::string, InfoSetData> store_;
};

}  // namespace nlhe
