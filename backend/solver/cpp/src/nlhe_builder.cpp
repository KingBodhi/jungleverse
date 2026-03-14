#include "nlhe_builder.hpp"
#include <sstream>
#include <algorithm>
#include <cmath>

namespace nlhe {

std::string NLHEConfig::to_string() const {
    std::ostringstream oss;
    oss << "NLHE Config: board=" << board.to_string()
        << " pot=" << pot << " stack=" << stack
        << " ranges=[" << range_p0.size() << "," << range_p1.size() << "]";
    return oss.str();
}

NLHEBuilder::NLHEBuilder(const NLHEConfig& config)
    : config_(config), stats_{} {}

void NLHEBuilder::init_deck() {
    deck_ = Deck();
    deck_.remove(config_.board);
    // Note: We don't remove range cards from deck here
    // because we handle card conflicts during traversal
}

NodePtr NLHEBuilder::build() {
    init_deck();

    // Determine starting street based on board size
    int street = 0;  // 0=flop, 1=turn, 2=river
    if (config_.board.size() == 4) street = 1;
    else if (config_.board.size() == 5) street = 2;

    // Initial stacks
    std::array<float, 2> stacks = {config_.stack, config_.stack};
    std::array<float, 2> bets = {0.0f, 0.0f};

    // Build from OOP (player 0) acting first
    NodePtr root = build_betting(street, 0, config_.pot, stacks, bets,
                                  0, true, "");

    stats_ = compute_tree_stats(root);
    return root;
}

NodePtr NLHEBuilder::build_betting(int street,
                                    int acting_player,
                                    float pot,
                                    std::array<float, 2> stacks,
                                    std::array<float, 2> bets,
                                    int num_raises,
                                    bool can_check,
                                    const std::string& history) {
    // Check if we're facing a bet
    bool facing_bet = bets[1 - acting_player] > bets[acting_player];

    return build_action_node(street, acting_player, pot, stacks, bets,
                              num_raises, facing_bet, history);
}

NodePtr NLHEBuilder::build_action_node(int street,
                                        int player,
                                        float pot,
                                        std::array<float, 2> stacks,
                                        std::array<float, 2> bets,
                                        int num_raises,
                                        bool facing_bet,
                                        const std::string& history) {
    auto node = std::make_shared<ActionNode>(player, pot, stacks, bets);
    node->info_set_key = history;

    float to_call = bets[1 - player] - bets[player];
    float effective_stack = std::min(stacks[0], stacks[1]);

    if (facing_bet) {
        // FOLD
        {
            NodePtr fold_child = build_fold_node(player, pot, bets);
            node->add_action(Action(ActionType::FOLD), fold_child);
        }

        // CALL
        {
            float call_amount = std::min(to_call, stacks[player]);
            std::array<float, 2> new_bets = bets;
            std::array<float, 2> new_stacks = stacks;
            new_bets[player] += call_amount;
            new_stacks[player] -= call_amount;

            float new_pot = pot + call_amount;
            std::string new_history = history + "c";

            // Check if this ends the street
            bool street_ends = (new_bets[0] == new_bets[1]) ||
                              (new_stacks[player] == 0);

            NodePtr call_child;
            if (street_ends) {
                // Check if all-in or if there are more streets
                if (new_stacks[0] == 0 || new_stacks[1] == 0 || street >= 2) {
                    // All-in or river -> showdown
                    call_child = build_showdown_node(new_pot, new_bets);
                } else {
                    // Next street
                    call_child = build_chance_node(street + 1, new_pot,
                                                    new_stacks, new_history);
                }
            } else {
                // Continue betting
                call_child = build_betting(street, 1 - player, new_pot,
                                            new_stacks, new_bets,
                                            num_raises, false, new_history);
            }
            node->add_action(Action(ActionType::CALL, call_amount), call_child);
        }

        // RAISE (if allowed)
        if (num_raises < config_.max_raises && stacks[player] > to_call) {
            float min_raise = to_call + std::max(to_call, pot * 0.1f);
            auto raise_sizes = get_bet_sizes(pot + to_call * 2,
                                              stacks[player] - to_call, to_call);

            for (float size : raise_sizes) {
                float raise_total = to_call + size;
                if (raise_total > stacks[player]) {
                    raise_total = stacks[player];
                }

                std::array<float, 2> new_bets = bets;
                std::array<float, 2> new_stacks = stacks;
                new_bets[player] += raise_total;
                new_stacks[player] -= raise_total;

                float new_pot = pot + raise_total;
                std::string new_history = history + "r" +
                    std::to_string(static_cast<int>(raise_total));

                bool is_all_in = (new_stacks[player] == 0);

                NodePtr raise_child;
                if (is_all_in && new_stacks[1 - player] == 0) {
                    raise_child = build_showdown_node(new_pot, new_bets);
                } else {
                    raise_child = build_betting(street, 1 - player, new_pot,
                                                 new_stacks, new_bets,
                                                 num_raises + 1, false,
                                                 new_history);
                }

                ActionType type = is_all_in ? ActionType::ALL_IN : ActionType::RAISE;
                node->add_action(Action(type, raise_total), raise_child);
            }
        }
    } else {
        // Not facing a bet: can check or bet

        // CHECK
        {
            std::string new_history = history + "x";

            NodePtr check_child;
            if (player == 1) {
                // Both checked - street ends
                if (street >= 2 || stacks[0] == 0 || stacks[1] == 0) {
                    check_child = build_showdown_node(pot, bets);
                } else {
                    check_child = build_chance_node(street + 1, pot, stacks,
                                                     new_history);
                }
            } else {
                // P0 checked, P1 acts
                check_child = build_betting(street, 1, pot, stacks, bets,
                                             num_raises, true, new_history);
            }
            node->add_action(Action(ActionType::CHECK), check_child);
        }

        // BET
        if (stacks[player] > 0) {
            auto bet_sizes = get_bet_sizes(pot, stacks[player], 0);

            for (float size : bet_sizes) {
                float bet_amount = std::min(size, stacks[player]);

                std::array<float, 2> new_bets = bets;
                std::array<float, 2> new_stacks = stacks;
                new_bets[player] += bet_amount;
                new_stacks[player] -= bet_amount;

                float new_pot = pot + bet_amount;
                std::string new_history = history + "b" +
                    std::to_string(static_cast<int>(bet_amount));

                bool is_all_in = (new_stacks[player] == 0);

                NodePtr bet_child = build_betting(street, 1 - player, new_pot,
                                                   new_stacks, new_bets,
                                                   num_raises, false,
                                                   new_history);

                ActionType type = is_all_in ? ActionType::ALL_IN : ActionType::BET;
                node->add_action(Action(type, bet_amount), bet_child);
            }
        }
    }

    return node;
}

NodePtr NLHEBuilder::build_chance_node(int next_street,
                                        float pot,
                                        std::array<float, 2> stacks,
                                        const std::string& history) {
    auto node = std::make_shared<ChanceNode>();

    // Get available cards
    std::vector<Card> available = deck_.available_cards();

    // Limit runouts for tractability
    size_t max_cards = std::min(available.size(),
                                 static_cast<size_t>(config_.max_runouts));

    float prob = 1.0f / max_cards;

    for (size_t i = 0; i < max_cards; ++i) {
        Card card = available[i];

        // Temporarily add card to board (conceptually)
        std::string new_history = history + "|" + card_to_string(card);

        // Build subtree starting with P0 acting
        std::array<float, 2> new_bets = {0.0f, 0.0f};
        NodePtr child = build_betting(next_street, 0, pot, stacks, new_bets,
                                       0, true, new_history);

        node->add_outcome(card, prob, child);
    }

    return node;
}

NodePtr NLHEBuilder::build_fold_node(int folding_player, float pot,
                                      std::array<float, 2> bets) {
    // Folding player loses their bets, opponent wins pot
    float p0_payoff, p1_payoff;

    if (folding_player == 0) {
        // P0 folds: P1 wins
        p0_payoff = -bets[0];
        p1_payoff = pot + bets[0];  // What was already in + P0's bet
    } else {
        // P1 folds: P0 wins
        p0_payoff = pot + bets[1];
        p1_payoff = -bets[1];
    }

    return std::make_shared<TerminalNode>(p0_payoff, p1_payoff, false);
}

NodePtr NLHEBuilder::build_showdown_node(float pot, std::array<float, 2> bets) {
    // Showdown: winner determined by hand strength
    // Payoff stored as half pot (winner gets pot, loser gets -bets)
    // Actual winner determined during CFR traversal

    float total_pot = pot + bets[0] + bets[1];
    float half_pot = total_pot / 2.0f;

    // Store the amount to be won/lost (sign determined at traversal)
    return std::make_shared<TerminalNode>(half_pot, -half_pot, true);
}

std::vector<float> NLHEBuilder::get_bet_sizes(float pot, float stack,
                                               float to_call) const {
    std::vector<float> sizes;

    for (float fraction : config_.bet_sizes) {
        float size = pot * fraction;
        // Ensure minimum bet is reasonable
        if (size < pot * 0.2f) size = pot * 0.2f;

        // Adjust for stack
        if (size > stack) {
            // Add all-in if not already close to another size
            if (sizes.empty() || stack > sizes.back() * 1.5f) {
                sizes.push_back(stack);
            }
            break;
        }

        sizes.push_back(size);
    }

    // Always allow all-in
    if (sizes.empty() || sizes.back() < stack) {
        sizes.push_back(stack);
    }

    // Remove duplicates and sort
    std::sort(sizes.begin(), sizes.end());
    sizes.erase(std::unique(sizes.begin(), sizes.end(),
                            [](float a, float b) { return std::abs(a - b) < 1.0f; }),
                sizes.end());

    return sizes;
}

std::string NLHEBuilder::make_info_set_key(const Hand& hand,
                                            const std::string& history) const {
    std::ostringstream oss;
    oss << hand.to_string() << "|" << config_.board.to_string() << "|" << history;
    return oss.str();
}

}  // namespace nlhe
