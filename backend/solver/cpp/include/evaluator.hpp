#pragma once

#include "cards.hpp"
#include <omp/HandEvaluator.h>
#include <array>

namespace nlhe {

// Wrapper around OMPEval for hand evaluation
class HandEvaluator {
public:
    HandEvaluator() = default;

    // Evaluate a 5-7 card hand, returns rank (higher = better)
    // Hand ranks are comparable: rank1 > rank2 means hand1 beats hand2
    uint16_t evaluate(const Hand& hole, const Board& board) const {
        omp::Hand h = omp::Hand::empty();

        // Add hole cards
        h += omp::Hand(to_omp_card(hole.cards[0]));
        h += omp::Hand(to_omp_card(hole.cards[1]));

        // Add board cards
        for (Card c : board.cards) {
            h += omp::Hand(to_omp_card(c));
        }

        return evaluator_.evaluate(h);
    }

    // Evaluate with raw card array (more flexible)
    uint16_t evaluate(const Card* cards, size_t count) const {
        omp::Hand h = omp::Hand::empty();
        for (size_t i = 0; i < count; ++i) {
            h += omp::Hand(to_omp_card(cards[i]));
        }
        return evaluator_.evaluate(h);
    }

    // Compare two hands on a given board
    // Returns: 1 if hand1 wins, -1 if hand2 wins, 0 if tie
    int compare(const Hand& hand1, const Hand& hand2, const Board& board) const {
        uint16_t rank1 = evaluate(hand1, board);
        uint16_t rank2 = evaluate(hand2, board);
        if (rank1 > rank2) return 1;
        if (rank1 < rank2) return -1;
        return 0;
    }

private:
    omp::HandEvaluator evaluator_;

    // Convert our card encoding to OMPEval encoding
    // OMPEval: rank 0-12 (2-A), suit 0-3
    // Our encoding: card = rank * 4 + suit
    // OMPEval encoding: card = suit * 13 + rank (different!)
    static unsigned to_omp_card(Card c) {
        int rank = rank_of(c);
        int suit = suit_of(c);
        // OMPEval uses: suit * 13 + rank
        return suit * 13 + rank;
    }
};

// Global evaluator instance (thread-safe for reads)
inline const HandEvaluator& get_evaluator() {
    static HandEvaluator instance;
    return instance;
}

}  // namespace nlhe
