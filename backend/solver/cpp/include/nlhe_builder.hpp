#pragma once

#include "game_tree.hpp"
#include "cards.hpp"
#include <vector>
#include <string>

namespace nlhe {

// Configuration for NLHE subgame
struct NLHEConfig {
    Board board;                          // Current board (flop/turn/river)
    Range range_p0;                       // Player 0's range
    Range range_p1;                       // Player 1's range
    float pot;                            // Current pot size
    float stack;                          // Effective stack remaining
    std::vector<float> bet_sizes;         // Bet sizes as fractions of pot
    int max_raises = 3;                   // Max raises per street
    int max_runouts = 6;                  // Max runout cards to enumerate

    // Validate configuration
    bool is_valid() const {
        return !range_p0.empty() &&
               !range_p1.empty() &&
               pot > 0 &&
               stack >= 0 &&
               !bet_sizes.empty() &&
               board.size() >= 3 && board.size() <= 5;
    }

    std::string to_string() const;
};

// NLHE game tree builder
class NLHEBuilder {
public:
    explicit NLHEBuilder(const NLHEConfig& config);

    // Build the game tree
    NodePtr build();

    // Get tree statistics after building
    const TreeStats& stats() const { return stats_; }

private:
    NLHEConfig config_;
    TreeStats stats_;
    Deck deck_;

    // Initialize deck (remove board and range cards)
    void init_deck();

    // Build betting round
    NodePtr build_betting(int street,
                          int acting_player,
                          float pot,
                          std::array<float, 2> stacks,
                          std::array<float, 2> bets,
                          int num_raises,
                          bool can_check,
                          const std::string& history);

    // Build action node
    NodePtr build_action_node(int street,
                              int player,
                              float pot,
                              std::array<float, 2> stacks,
                              std::array<float, 2> bets,
                              int num_raises,
                              bool facing_bet,
                              const std::string& history);

    // Build chance node for next street
    NodePtr build_chance_node(int next_street,
                              float pot,
                              std::array<float, 2> stacks,
                              const std::string& history);

    // Build terminal node (fold or showdown)
    NodePtr build_fold_node(int folding_player, float pot,
                            std::array<float, 2> bets);
    NodePtr build_showdown_node(float pot, std::array<float, 2> bets);

    // Get available bet sizes for current pot
    std::vector<float> get_bet_sizes(float pot, float stack, float to_call) const;

    // Generate info set key
    std::string make_info_set_key(const Hand& hand, const std::string& history) const;
};

}  // namespace nlhe
