/**
 * Basic tests for the NLHE solver components.
 *
 * Run with: ./solver_tests
 * Requires Google Test (gtest)
 */

#include <gtest/gtest.h>
#include "cards.hpp"
#include "evaluator.hpp"
#include "game_tree.hpp"
#include "info_set.hpp"

using namespace nlhe;

// Card tests
TEST(CardsTest, CardEncoding) {
    // 2c = 0, 2d = 1, 2h = 2, 2s = 3
    EXPECT_EQ(make_card(0, 0), 0);  // 2c
    EXPECT_EQ(make_card(0, 3), 3);  // 2s
    EXPECT_EQ(make_card(12, 0), 48);  // Ac
    EXPECT_EQ(make_card(12, 3), 51);  // As
}

TEST(CardsTest, RankAndSuit) {
    Card ace_spades = make_card(12, 3);  // As
    EXPECT_EQ(rank_of(ace_spades), 12);
    EXPECT_EQ(suit_of(ace_spades), 3);
}

TEST(CardsTest, CardToString) {
    EXPECT_EQ(card_to_string(make_card(12, 3)), "As");
    EXPECT_EQ(card_to_string(make_card(0, 0)), "2c");
    EXPECT_EQ(card_to_string(make_card(8, 2)), "Th");
}

TEST(CardsTest, CardFromString) {
    EXPECT_EQ(card_from_string("As"), make_card(12, 3));
    EXPECT_EQ(card_from_string("2c"), make_card(0, 0));
    EXPECT_EQ(card_from_string("Th"), make_card(8, 2));
}

TEST(CardsTest, Hand) {
    Hand h(make_card(12, 3), make_card(12, 2));  // AsAh
    EXPECT_EQ(h.to_string(), "AsAh");
    EXPECT_TRUE(h.contains(make_card(12, 3)));
    EXPECT_FALSE(h.contains(make_card(11, 3)));  // Ks
}

TEST(CardsTest, Board) {
    Board b;
    b.add(make_card(10, 3));  // Qs
    b.add(make_card(7, 1));   // 9d
    b.add(make_card(0, 0));   // 2c
    EXPECT_EQ(b.size(), 3);
    EXPECT_EQ(b.to_string(), "Qs9d2c");
}

TEST(CardsTest, Deck) {
    Deck d;
    EXPECT_EQ(d.count(), 52);

    Hand h(make_card(12, 3), make_card(12, 2));  // AsAh
    d.remove(h);
    EXPECT_EQ(d.count(), 50);
    EXPECT_FALSE(d.is_available(make_card(12, 3)));
    EXPECT_TRUE(d.is_available(make_card(12, 1)));  // Ad still available
}

// Evaluator tests
TEST(EvaluatorTest, PairBeatsHighCard) {
    HandEvaluator eval;

    // AA vs KQ on 2c3d4h5s7c
    Hand aa(make_card(12, 3), make_card(12, 2));  // AsAh
    Hand kq(make_card(11, 3), make_card(10, 2));  // KsQh

    Board board;
    board.add(make_card(0, 0));   // 2c
    board.add(make_card(1, 1));   // 3d
    board.add(make_card(2, 2));   // 4h
    board.add(make_card(3, 3));   // 5s
    board.add(make_card(5, 0));   // 7c

    uint16_t rank_aa = eval.evaluate(aa, board);
    uint16_t rank_kq = eval.evaluate(kq, board);

    EXPECT_GT(rank_aa, rank_kq);  // Pair of aces beats high card
}

// InfoSet tests
TEST(InfoSetTest, RegretMatching) {
    InfoSetData data(3);

    // Initially uniform
    auto strategy = data.get_strategy();
    EXPECT_NEAR(strategy[0], 1.0f / 3.0f, 0.001f);
    EXPECT_NEAR(strategy[1], 1.0f / 3.0f, 0.001f);
    EXPECT_NEAR(strategy[2], 1.0f / 3.0f, 0.001f);

    // Add regrets
    data.update_regret({10.0f, 5.0f, 0.0f});

    strategy = data.get_strategy();
    EXPECT_NEAR(strategy[0], 10.0f / 15.0f, 0.001f);
    EXPECT_NEAR(strategy[1], 5.0f / 15.0f, 0.001f);
    EXPECT_NEAR(strategy[2], 0.0f, 0.001f);
}

TEST(InfoSetTest, NodeLocking) {
    InfoSetData data(2);

    // Lock to always fold
    data.lock({1.0f, 0.0f});
    EXPECT_TRUE(data.is_locked());

    auto strategy = data.get_strategy();
    EXPECT_NEAR(strategy[0], 1.0f, 0.001f);
    EXPECT_NEAR(strategy[1], 0.0f, 0.001f);

    // Regret updates should be ignored
    data.update_regret({-100.0f, 100.0f});
    strategy = data.get_strategy();
    EXPECT_NEAR(strategy[0], 1.0f, 0.001f);  // Still locked

    // Unlock
    data.unlock();
    EXPECT_FALSE(data.is_locked());
}

TEST(InfoSetStoreTest, GetOrCreate) {
    InfoSetStore store;

    auto& data1 = store.get_or_create("key1", 2);
    auto& data2 = store.get_or_create("key1", 2);

    EXPECT_EQ(&data1, &data2);  // Same reference
    EXPECT_EQ(store.size(), 1);

    store.get_or_create("key2", 3);
    EXPECT_EQ(store.size(), 2);
}

// GameTree tests
TEST(GameTreeTest, ActionNode) {
    std::array<float, 2> stacks = {100.0f, 100.0f};
    std::array<float, 2> bets = {0.0f, 0.0f};

    auto node = std::make_shared<ActionNode>(0, 50.0f, stacks, bets);
    EXPECT_EQ(node->type(), NodeType::ACTION);
    EXPECT_EQ(node->player, 0);
    EXPECT_EQ(node->pot, 50.0f);

    node->add_action(Action(ActionType::CHECK), nullptr);
    node->add_action(Action(ActionType::BET, 25.0f), nullptr);
    EXPECT_EQ(node->num_actions(), 2);
}

TEST(GameTreeTest, TerminalNode) {
    auto node = std::make_shared<TerminalNode>(50.0f, -50.0f, true);
    EXPECT_EQ(node->type(), NodeType::TERMINAL);
    EXPECT_TRUE(node->is_showdown);
    EXPECT_EQ(node->payoffs[0], 50.0f);
    EXPECT_EQ(node->payoffs[1], -50.0f);
}

int main(int argc, char** argv) {
    testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
