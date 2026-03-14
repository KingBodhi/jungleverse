#pragma once

#include "cards.hpp"
#include <string>
#include <vector>
#include <memory>
#include <cstdint>

namespace nlhe {

// Forward declaration
class GameNode;
using NodePtr = std::shared_ptr<GameNode>;

// Action types
enum class ActionType : uint8_t {
    FOLD,
    CHECK,
    CALL,
    BET,
    RAISE,
    ALL_IN
};

// Node types
enum class NodeType : uint8_t {
    ACTION,
    CHANCE,
    TERMINAL
};

// An action with optional size
struct Action {
    ActionType type;
    float size;  // Bet/raise size (0 for fold/check/call)

    Action(ActionType t, float s = 0.0f) : type(t), size(s) {}

    std::string to_string() const {
        switch (type) {
            case ActionType::FOLD: return "fold";
            case ActionType::CHECK: return "check";
            case ActionType::CALL: return "call";
            case ActionType::BET:
                return "bet_" + std::to_string(static_cast<int>(size));
            case ActionType::RAISE:
                return "raise_" + std::to_string(static_cast<int>(size));
            case ActionType::ALL_IN: return "allin";
            default: return "unknown";
        }
    }

    bool operator==(const Action& other) const {
        return type == other.type &&
               (type == ActionType::FOLD || type == ActionType::CHECK ||
                type == ActionType::CALL || size == other.size);
    }
};

// Base class for all game tree nodes
class GameNode {
public:
    virtual ~GameNode() = default;
    virtual NodeType type() const = 0;
};

// Action node: player makes a decision
class ActionNode : public GameNode {
public:
    int player;  // 0 or 1
    std::vector<Action> actions;
    std::vector<NodePtr> children;  // Parallel to actions
    std::string info_set_key;  // Unique identifier for this info set

    // Game state
    float pot;
    std::array<float, 2> stacks;
    std::array<float, 2> bets;  // Current round bets

    ActionNode(int p, float pot_size, std::array<float, 2> stk, std::array<float, 2> b)
        : player(p), pot(pot_size), stacks(stk), bets(b) {}

    NodeType type() const override { return NodeType::ACTION; }

    size_t num_actions() const { return actions.size(); }

    void add_action(const Action& a, NodePtr child) {
        actions.push_back(a);
        children.push_back(child);
    }
};

// Chance node: board card dealt
class ChanceNode : public GameNode {
public:
    std::vector<Card> outcomes;  // Possible cards
    std::vector<float> probabilities;
    std::vector<NodePtr> children;  // Parallel to outcomes

    NodeType type() const override { return NodeType::CHANCE; }

    void add_outcome(Card c, float prob, NodePtr child) {
        outcomes.push_back(c);
        probabilities.push_back(prob);
        children.push_back(child);
    }

    size_t num_outcomes() const { return outcomes.size(); }
};

// Terminal node: hand is over
class TerminalNode : public GameNode {
public:
    std::array<float, 2> payoffs;  // Net payoff for each player
    bool is_showdown;

    TerminalNode(float p0, float p1, bool showdown = false)
        : payoffs{p0, p1}, is_showdown(showdown) {}

    NodeType type() const override { return NodeType::TERMINAL; }
};

// Helper to check node type
inline bool is_action_node(const GameNode* node) {
    return node && node->type() == NodeType::ACTION;
}

inline bool is_chance_node(const GameNode* node) {
    return node && node->type() == NodeType::CHANCE;
}

inline bool is_terminal_node(const GameNode* node) {
    return node && node->type() == NodeType::TERMINAL;
}

// Safe casts
inline ActionNode* as_action_node(GameNode* node) {
    return is_action_node(node) ? static_cast<ActionNode*>(node) : nullptr;
}

inline ChanceNode* as_chance_node(GameNode* node) {
    return is_chance_node(node) ? static_cast<ChanceNode*>(node) : nullptr;
}

inline TerminalNode* as_terminal_node(GameNode* node) {
    return is_terminal_node(node) ? static_cast<TerminalNode*>(node) : nullptr;
}

inline const ActionNode* as_action_node(const GameNode* node) {
    return is_action_node(node) ? static_cast<const ActionNode*>(node) : nullptr;
}

inline const ChanceNode* as_chance_node(const GameNode* node) {
    return is_chance_node(node) ? static_cast<const ChanceNode*>(node) : nullptr;
}

inline const TerminalNode* as_terminal_node(const GameNode* node) {
    return is_terminal_node(node) ? static_cast<const TerminalNode*>(node) : nullptr;
}

// Tree statistics
struct TreeStats {
    size_t action_nodes = 0;
    size_t chance_nodes = 0;
    size_t terminal_nodes = 0;
    size_t info_sets = 0;
    size_t max_depth = 0;

    size_t total_nodes() const {
        return action_nodes + chance_nodes + terminal_nodes;
    }
};

// Compute tree statistics
TreeStats compute_tree_stats(const NodePtr& root);

}  // namespace nlhe
