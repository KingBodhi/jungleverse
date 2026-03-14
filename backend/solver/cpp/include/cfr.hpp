#pragma once

#include "game_tree.hpp"
#include "info_set.hpp"
#include "cards.hpp"
#include "evaluator.hpp"
#include <functional>
#include <array>
#include <atomic>

namespace nlhe {

// Progress callback: (iteration, completed_iterations, total_iterations, ev_estimate)
using ProgressCallback = std::function<void(int, int, int, float)>;

// Solve result
struct SolveResult {
    float ev_p0 = 0.0f;
    float exploitability = 0.0f;
    int completed_iterations = 0;
    bool cancelled = false;
    std::string error;
};

// CFR+ Solver
class CFRSolver {
public:
    CFRSolver(NodePtr root, InfoSetStore& info_store,
              const Range& range_p0, const Range& range_p1,
              const Board& board);

    // Run CFR+ for specified iterations
    SolveResult solve(int num_iterations,
                      ProgressCallback callback = nullptr,
                      std::atomic<bool>* cancel_flag = nullptr,
                      int callback_interval = 100);

    // Compute exploitability (best response calculation)
    float compute_exploitability();

    // Get EV for player 0
    float get_ev_p0() const { return ev_p0_; }

private:
    NodePtr root_;
    InfoSetStore& info_store_;
    Range range_p0_;
    Range range_p1_;
    Board board_;
    const HandEvaluator& evaluator_;

    float ev_p0_ = 0.0f;

    // CFR traversal
    // reach = [p0_reach, p1_reach, chance_reach]
    float cfr_traverse(const GameNode* node,
                       const Hand& hand_p0, const Hand& hand_p1,
                       std::array<float, 3> reach,
                       int traversing_player);

    // Compute counterfactual values for action node
    float cfr_action_node(const ActionNode* node,
                          const Hand& hand_p0, const Hand& hand_p1,
                          std::array<float, 3> reach,
                          int traversing_player);

    // Handle chance node
    float cfr_chance_node(const ChanceNode* node,
                          const Hand& hand_p0, const Hand& hand_p1,
                          std::array<float, 3> reach,
                          int traversing_player);

    // Handle terminal node
    float cfr_terminal_node(const TerminalNode* node,
                            const Hand& hand_p0, const Hand& hand_p1,
                            int traversing_player);

    // Build info set key for a hand at an action node
    std::string make_info_set_key(const ActionNode* node,
                                  const Hand& hand, int player) const;

    // Best response computation for exploitability
    float compute_best_response(int player);

    float br_traverse(const GameNode* node,
                      const Hand& hand_p0, const Hand& hand_p1,
                      float reach, int br_player);
};

}  // namespace nlhe
