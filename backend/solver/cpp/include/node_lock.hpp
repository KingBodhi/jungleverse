#pragma once

#include "info_set.hpp"
#include <string>
#include <vector>
#include <unordered_map>

namespace nlhe {

// Lock specification: info set key -> fixed strategy
using LockSpec = std::unordered_map<std::string, std::vector<float>>;

// Result of applying locks
struct LockResult {
    std::unordered_map<std::string, bool> applied;  // key -> success
    std::vector<std::string> errors;
};

// Node locker utility
class NodeLocker {
public:
    explicit NodeLocker(InfoSetStore& store) : store_(store) {}

    // Apply locks to info sets
    LockResult apply_locks(const LockSpec& locks);

    // Unlock all info sets (for fresh solve)
    void unlock_all();

    // Unlock specific info sets
    void unlock(const std::vector<std::string>& keys);

    // Get currently locked info sets
    std::vector<std::string> get_locked_keys() const;

    // Check if a key is locked
    bool is_locked(const std::string& key) const;

    // Prepare for re-solve: reset regrets on unlocked info sets
    void prepare_for_resolve();

private:
    InfoSetStore& store_;
};

}  // namespace nlhe
