#pragma once

#include <cstdint>
#include <string>
#include <vector>
#include <array>
#include <bitset>
#include <stdexcept>

namespace nlhe {

// Card encoding: 0-51, where card = rank * 4 + suit
// Ranks: 2=0, 3=1, ..., T=8, J=9, Q=10, K=11, A=12
// Suits: c=0, d=1, h=2, s=3
using Card = uint8_t;
constexpr Card INVALID_CARD = 255;

constexpr int NUM_RANKS = 13;
constexpr int NUM_SUITS = 4;
constexpr int NUM_CARDS = 52;

// Card manipulation
inline constexpr int rank_of(Card c) { return c / 4; }
inline constexpr int suit_of(Card c) { return c % 4; }
inline constexpr Card make_card(int rank, int suit) { return rank * 4 + suit; }

// String conversion
inline char rank_char(int rank) {
    constexpr char chars[] = "23456789TJQKA";
    return chars[rank];
}

inline char suit_char(int suit) {
    constexpr char chars[] = "cdhs";
    return chars[suit];
}

inline int rank_from_char(char c) {
    switch (c) {
        case '2': return 0; case '3': return 1; case '4': return 2;
        case '5': return 3; case '6': return 4; case '7': return 5;
        case '8': return 6; case '9': return 7; case 'T': case 't': return 8;
        case 'J': case 'j': return 9; case 'Q': case 'q': return 10;
        case 'K': case 'k': return 11; case 'A': case 'a': return 12;
        default: return -1;
    }
}

inline int suit_from_char(char c) {
    switch (c) {
        case 'c': case 'C': return 0;
        case 'd': case 'D': return 1;
        case 'h': case 'H': return 2;
        case 's': case 'S': return 3;
        default: return -1;
    }
}

inline std::string card_to_string(Card c) {
    if (c >= NUM_CARDS) return "??";
    return std::string(1, rank_char(rank_of(c))) + suit_char(suit_of(c));
}

inline Card card_from_string(const std::string& s) {
    if (s.size() != 2) return INVALID_CARD;
    int rank = rank_from_char(s[0]);
    int suit = suit_from_char(s[1]);
    if (rank < 0 || suit < 0) return INVALID_CARD;
    return make_card(rank, suit);
}

// Hand = 2 hole cards
struct Hand {
    Card cards[2];

    Hand() : cards{INVALID_CARD, INVALID_CARD} {}
    Hand(Card c1, Card c2) : cards{c1, c2} {
        // Canonicalize: higher card first
        if (cards[0] < cards[1]) std::swap(cards[0], cards[1]);
    }

    bool operator==(const Hand& other) const {
        return cards[0] == other.cards[0] && cards[1] == other.cards[1];
    }

    bool contains(Card c) const {
        return cards[0] == c || cards[1] == c;
    }

    std::string to_string() const {
        return card_to_string(cards[0]) + card_to_string(cards[1]);
    }
};

// Board = 0-5 community cards
struct Board {
    std::vector<Card> cards;

    Board() = default;
    Board(std::initializer_list<Card> init) : cards(init) {}

    void add(Card c) { cards.push_back(c); }
    size_t size() const { return cards.size(); }
    bool contains(Card c) const {
        for (Card bc : cards) if (bc == c) return true;
        return false;
    }

    std::string to_string() const {
        std::string s;
        for (Card c : cards) s += card_to_string(c);
        return s;
    }
};

// Deck representation as bitset for efficient card removal
class Deck {
public:
    Deck() : available_() { available_.set(); }  // All 52 cards available

    void remove(Card c) { available_.reset(c); }
    void remove(const Hand& h) { remove(h.cards[0]); remove(h.cards[1]); }
    void remove(const Board& b) { for (Card c : b.cards) remove(c); }

    void restore(Card c) { available_.set(c); }

    bool is_available(Card c) const { return available_.test(c); }

    // Get all available cards
    std::vector<Card> available_cards() const {
        std::vector<Card> result;
        result.reserve(available_.count());
        for (int i = 0; i < NUM_CARDS; ++i) {
            if (available_.test(i)) result.push_back(static_cast<Card>(i));
        }
        return result;
    }

    size_t count() const { return available_.count(); }

private:
    std::bitset<NUM_CARDS> available_;
};

// Range = list of hands a player can have
using Range = std::vector<Hand>;

// Combo weight for strategy calculations (hand, probability)
struct WeightedHand {
    Hand hand;
    float weight;  // Typically 1.0, but can be fractional for blockers

    WeightedHand(Hand h, float w = 1.0f) : hand(h), weight(w) {}
};

}  // namespace nlhe
