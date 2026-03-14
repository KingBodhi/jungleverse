#include "node_lock.hpp"

namespace nlhe {

LockResult NodeLocker::apply_locks(const LockSpec& locks) {
    LockResult result;

    for (const auto& [key, strategy] : locks) {
        InfoSetData* info_set = store_.get(key);

        if (!info_set) {
            result.applied[key] = false;
            result.errors.push_back("Info set not found: " + key);
            continue;
        }

        // Validate strategy size
        if (strategy.size() != info_set->num_actions()) {
            result.applied[key] = false;
            result.errors.push_back("Strategy size mismatch for: " + key);
            continue;
        }

        // Validate strategy sums to 1
        float sum = 0.0f;
        for (float p : strategy) {
            if (p < 0.0f || p > 1.0f) {
                result.applied[key] = false;
                result.errors.push_back("Invalid probability in strategy for: " + key);
                continue;
            }
            sum += p;
        }

        if (std::abs(sum - 1.0f) > 0.01f) {
            result.applied[key] = false;
            result.errors.push_back("Strategy doesn't sum to 1 for: " + key);
            continue;
        }

        // Apply the lock
        info_set->lock(strategy);
        result.applied[key] = true;
    }

    return result;
}

void NodeLocker::unlock_all() {
    for (auto& [key, data] : store_) {
        if (data.is_locked()) {
            data.unlock();
        }
    }
}

void NodeLocker::unlock(const std::vector<std::string>& keys) {
    for (const auto& key : keys) {
        InfoSetData* info_set = store_.get(key);
        if (info_set && info_set->is_locked()) {
            info_set->unlock();
        }
    }
}

std::vector<std::string> NodeLocker::get_locked_keys() const {
    std::vector<std::string> result;
    for (const auto& [key, data] : store_) {
        if (data.is_locked()) {
            result.push_back(key);
        }
    }
    return result;
}

bool NodeLocker::is_locked(const std::string& key) const {
    const InfoSetData* info_set = store_.get(key);
    return info_set && info_set->is_locked();
}

void NodeLocker::prepare_for_resolve() {
    store_.reset_all_regrets();
}

}  // namespace nlhe
