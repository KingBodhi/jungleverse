#include "cfr.hpp"
#include <cmath>
#include <algorithm>
#include <sstream>

#ifdef _OPENMP
#include <omp.h>
#endif

namespace nlhe {

CFRSolver::CFRSolver(NodePtr root, InfoSetStore& info_store,
                     const Range& range_p0, const Range& range_p1,
                     const Board& board)
    : root_(root),
      info_store_(info_store),
      range_p0_(range_p0),
      range_p1_(range_p1),
      board_(board),
      evaluator_(get_evaluator()) {}

SolveResult CFRSolver::solve(int num_iterations,
                              ProgressCallback callback,
                              std::atomic<bool>* cancel_flag,
                              int callback_interval) {
    SolveResult result{};
    result.completed_iterations = 0;
    result.cancelled = false;

    float ev_sum = 0.0f;

    for (int iter = 0; iter < num_iterations; ++iter) {
        // Check for cancellation
        if (cancel_flag && cancel_flag->load()) {
            result.cancelled = true;
            break;
        }

        // Alternating updates: even iterations update P0, odd update P1
        int traversing_player = iter % 2;

        // Traverse all hand combinations
        float iter_ev = 0.0f;
        float total_weight = 0.0f;

        // Flatten loops for OpenMP parallelization
        const size_t n_p0 = range_p0_.size();
        const size_t n_p1 = range_p1_.size();
        const size_t total_combos = n_p0 * n_p1;

        #ifdef _OPENMP
        #pragma omp parallel for reduction(+:iter_ev, total_weight) schedule(dynamic, 64)
        #endif
        for (size_t idx = 0; idx < total_combos; ++idx) {
            const size_t i = idx / n_p1;
            const size_t j = idx % n_p1;
            const Hand& h0 = range_p0_[i];
            const Hand& h1 = range_p1_[j];

            // Skip if hands share cards
            if (h0.contains(h1.cards[0]) || h0.contains(h1.cards[1])) {
                continue;
            }
            // Skip if hands conflict with board
            if (board_.contains(h0.cards[0]) || board_.contains(h0.cards[1]) ||
                board_.contains(h1.cards[0]) || board_.contains(h1.cards[1])) {
                continue;
            }

            std::array<float, 3> reach = {1.0f, 1.0f, 1.0f};
            float ev = cfr_traverse(root_.get(), h0, h1, reach, traversing_player);

            if (traversing_player == 0) {
                iter_ev += ev;
                total_weight += 1.0f;
            }
        }

        if (traversing_player == 0 && total_weight > 0) {
            ev_sum += iter_ev / total_weight;
        }

        result.completed_iterations = iter + 1;

        // Progress callback
        if (callback && (iter + 1) % callback_interval == 0) {
            float current_ev = (iter > 0) ? ev_sum / ((iter / 2) + 1) : 0.0f;
            callback(iter + 1, iter + 1, num_iterations, current_ev);
        }
    }

    // Final EV estimate (average over P0 traversals)
    int p0_traversals = (result.completed_iterations + 1) / 2;
    ev_p0_ = (p0_traversals > 0) ? ev_sum / p0_traversals : 0.0f;
    result.ev_p0 = ev_p0_;

    // Compute exploitability
    result.exploitability = compute_exploitability();

    return result;
}

float CFRSolver::cfr_traverse(const GameNode* node,
                               const Hand& hand_p0, const Hand& hand_p1,
                               std::array<float, 3> reach,
                               int traversing_player) {
    if (!node) return 0.0f;

    switch (node->type()) {
        case NodeType::ACTION:
            return cfr_action_node(as_action_node(node), hand_p0, hand_p1,
                                   reach, traversing_player);
        case NodeType::CHANCE:
            return cfr_chance_node(as_chance_node(node), hand_p0, hand_p1,
                                   reach, traversing_player);
        case NodeType::TERMINAL:
            return cfr_terminal_node(as_terminal_node(node), hand_p0, hand_p1,
                                     traversing_player);
        default:
            return 0.0f;
    }
}

float CFRSolver::cfr_action_node(const ActionNode* node,
                                  const Hand& hand_p0, const Hand& hand_p1,
                                  std::array<float, 3> reach,
                                  int traversing_player) {
    int player = node->player;
    const Hand& hand = (player == 0) ? hand_p0 : hand_p1;

    // Build info set key
    std::string key = make_info_set_key(node, hand, player);

    // Get or create info set
    InfoSetData& info_set = info_store_.get_or_create(key, node->num_actions());

    // Get current strategy
    std::vector<float> strategy = info_set.get_strategy();

    if (player == traversing_player) {
        // Traversing player: compute counterfactual values
        std::vector<float> action_values(node->num_actions());
        float node_value = 0.0f;

        for (size_t a = 0; a < node->num_actions(); ++a) {
            std::array<float, 3> new_reach = reach;
            new_reach[player] *= strategy[a];

            action_values[a] = cfr_traverse(node->children[a].get(),
                                            hand_p0, hand_p1,
                                            new_reach, traversing_player);
            node_value += strategy[a] * action_values[a];
        }

        // Compute regrets
        std::vector<float> regrets(node->num_actions());
        float cf_reach = reach[1 - player] * reach[2];  // Opponent * chance

        for (size_t a = 0; a < node->num_actions(); ++a) {
            regrets[a] = cf_reach * (action_values[a] - node_value);
        }

        // Update regrets (CFR+)
        info_set.update_regret(regrets);

        return node_value;
    } else {
        // Opponent: just sample with current strategy
        float node_value = 0.0f;

        // Update strategy sum
        info_set.update_strategy(strategy, reach[player]);

        for (size_t a = 0; a < node->num_actions(); ++a) {
            std::array<float, 3> new_reach = reach;
            new_reach[player] *= strategy[a];

            float action_value = cfr_traverse(node->children[a].get(),
                                              hand_p0, hand_p1,
                                              new_reach, traversing_player);
            node_value += strategy[a] * action_value;
        }

        return node_value;
    }
}

float CFRSolver::cfr_chance_node(const ChanceNode* node,
                                  const Hand& hand_p0, const Hand& hand_p1,
                                  std::array<float, 3> reach,
                                  int traversing_player) {
    float value = 0.0f;

    for (size_t i = 0; i < node->num_outcomes(); ++i) {
        Card card = node->outcomes[i];

        // Skip if card conflicts with hands
        if (hand_p0.contains(card) || hand_p1.contains(card)) {
            continue;
        }

        std::array<float, 3> new_reach = reach;
        new_reach[2] *= node->probabilities[i];

        value += node->probabilities[i] *
                 cfr_traverse(node->children[i].get(), hand_p0, hand_p1,
                              new_reach, traversing_player);
    }

    return value;
}

float CFRSolver::cfr_terminal_node(const TerminalNode* node,
                                    const Hand& hand_p0, const Hand& hand_p1,
                                    int traversing_player) {
    if (node->is_showdown) {
        // Evaluate hands
        int result = evaluator_.compare(hand_p0, hand_p1, board_);

        // Payoff magnitude from node, sign from comparison
        float pot_won = std::abs(node->payoffs[0]);  // Half pot typically

        if (result > 0) {
            // P0 wins
            return (traversing_player == 0) ? pot_won : -pot_won;
        } else if (result < 0) {
            // P1 wins
            return (traversing_player == 0) ? -pot_won : pot_won;
        } else {
            // Tie - split pot
            return 0.0f;
        }
    }

    // Fold - payoff is fixed
    return node->payoffs[traversing_player];
}

std::string CFRSolver::make_info_set_key(const ActionNode* node,
                                          const Hand& hand, int player) const {
    // Format: "AhKh|Qs9d2c|history"
    std::ostringstream oss;
    oss << hand.to_string() << "|" << board_.to_string() << "|";
    oss << node->info_set_key;
    return oss.str();
}

float CFRSolver::compute_exploitability() {
    // Exploitability = BR_EV_P0 + BR_EV_P1
    // Where BR_EV_Pi is player i's EV when playing best response
    // against opponent's average strategy

    float br_ev_p0 = compute_best_response(0);
    float br_ev_p1 = compute_best_response(1);

    return br_ev_p0 + br_ev_p1;
}

float CFRSolver::compute_best_response(int br_player) {
    float total_ev = 0.0f;
    float total_weight = 0.0f;

    // Flatten loops for OpenMP parallelization
    const size_t n_p0 = range_p0_.size();
    const size_t n_p1 = range_p1_.size();
    const size_t total_combos = n_p0 * n_p1;

    #ifdef _OPENMP
    #pragma omp parallel for reduction(+:total_ev, total_weight) schedule(dynamic, 64)
    #endif
    for (size_t idx = 0; idx < total_combos; ++idx) {
        const size_t i = idx / n_p1;
        const size_t j = idx % n_p1;
        const Hand& h0 = range_p0_[i];
        const Hand& h1 = range_p1_[j];

        // Skip conflicting hands
        if (h0.contains(h1.cards[0]) || h0.contains(h1.cards[1])) {
            continue;
        }
        if (board_.contains(h0.cards[0]) || board_.contains(h0.cards[1]) ||
            board_.contains(h1.cards[0]) || board_.contains(h1.cards[1])) {
            continue;
        }

        float ev = br_traverse(root_.get(), h0, h1, 1.0f, br_player);
        total_ev += ev;
        total_weight += 1.0f;
    }

    return (total_weight > 0) ? total_ev / total_weight : 0.0f;
}

float CFRSolver::br_traverse(const GameNode* node,
                              const Hand& hand_p0, const Hand& hand_p1,
                              float reach, int br_player) {
    if (!node) return 0.0f;

    switch (node->type()) {
        case NodeType::ACTION: {
            auto* action_node = as_action_node(node);
            int player = action_node->player;
            const Hand& hand = (player == 0) ? hand_p0 : hand_p1;
            std::string key = make_info_set_key(action_node, hand, player);

            const InfoSetData* info_set = info_store_.get(key);
            if (!info_set) {
                // Info set not found - use uniform
                float avg_ev = 0.0f;
                for (size_t a = 0; a < action_node->num_actions(); ++a) {
                    avg_ev += br_traverse(action_node->children[a].get(),
                                          hand_p0, hand_p1,
                                          reach / action_node->num_actions(),
                                          br_player);
                }
                return avg_ev / action_node->num_actions();
            }

            std::vector<float> strategy = info_set->get_average_strategy();

            if (player == br_player) {
                // Best response: pick best action
                float best_ev = -1e9f;
                for (size_t a = 0; a < action_node->num_actions(); ++a) {
                    float ev = br_traverse(action_node->children[a].get(),
                                           hand_p0, hand_p1, reach, br_player);
                    best_ev = std::max(best_ev, ev);
                }
                return best_ev;
            } else {
                // Opponent: play average strategy
                float ev = 0.0f;
                for (size_t a = 0; a < action_node->num_actions(); ++a) {
                    ev += strategy[a] * br_traverse(action_node->children[a].get(),
                                                    hand_p0, hand_p1,
                                                    reach * strategy[a], br_player);
                }
                return ev;
            }
        }
        case NodeType::CHANCE: {
            auto* chance_node = as_chance_node(node);
            float value = 0.0f;
            for (size_t i = 0; i < chance_node->num_outcomes(); ++i) {
                Card card = chance_node->outcomes[i];
                if (hand_p0.contains(card) || hand_p1.contains(card)) {
                    continue;
                }
                value += chance_node->probabilities[i] *
                         br_traverse(chance_node->children[i].get(),
                                     hand_p0, hand_p1,
                                     reach * chance_node->probabilities[i],
                                     br_player);
            }
            return value;
        }
        case NodeType::TERMINAL: {
            auto* terminal_node = as_terminal_node(node);
            if (terminal_node->is_showdown) {
                int result = evaluator_.compare(hand_p0, hand_p1, board_);
                float pot_won = std::abs(terminal_node->payoffs[0]);

                if (result > 0) {
                    return (br_player == 0) ? pot_won : -pot_won;
                } else if (result < 0) {
                    return (br_player == 0) ? -pot_won : pot_won;
                }
                return 0.0f;
            }
            return terminal_node->payoffs[br_player];
        }
        default:
            return 0.0f;
    }
}

}  // namespace nlhe
