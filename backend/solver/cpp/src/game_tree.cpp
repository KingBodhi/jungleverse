#include "game_tree.hpp"
#include <unordered_set>

namespace nlhe {

namespace {

void compute_stats_recursive(const NodePtr& node,
                             TreeStats& stats,
                             std::unordered_set<std::string>& info_sets,
                             size_t depth) {
    if (!node) return;

    stats.max_depth = std::max(stats.max_depth, depth);

    switch (node->type()) {
        case NodeType::ACTION: {
            stats.action_nodes++;
            auto* action_node = as_action_node(node.get());
            if (!action_node->info_set_key.empty()) {
                info_sets.insert(action_node->info_set_key);
            }
            for (const auto& child : action_node->children) {
                compute_stats_recursive(child, stats, info_sets, depth + 1);
            }
            break;
        }
        case NodeType::CHANCE: {
            stats.chance_nodes++;
            auto* chance_node = as_chance_node(node.get());
            for (const auto& child : chance_node->children) {
                compute_stats_recursive(child, stats, info_sets, depth + 1);
            }
            break;
        }
        case NodeType::TERMINAL: {
            stats.terminal_nodes++;
            break;
        }
    }
}

}  // anonymous namespace

TreeStats compute_tree_stats(const NodePtr& root) {
    TreeStats stats;
    std::unordered_set<std::string> info_sets;
    compute_stats_recursive(root, stats, info_sets, 0);
    stats.info_sets = info_sets.size();
    return stats;
}

}  // namespace nlhe
