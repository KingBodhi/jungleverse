#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include <pybind11/functional.h>
#include <atomic>
#include <memory>
#include <sstream>

#include "cards.hpp"
#include "evaluator.hpp"
#include "game_tree.hpp"
#include "info_set.hpp"
#include "cfr.hpp"
#include "nlhe_builder.hpp"
#include "node_lock.hpp"

namespace py = pybind11;
using namespace nlhe;

// Strategy entry for Python
struct StrategyEntry {
    std::string info_set_key;
    std::vector<std::string> actions;
    std::vector<float> probabilities;
    bool is_locked;
};

// Complete solve result for Python
struct PySolveResult {
    std::string solve_id;
    float ev_p0 = 0.0f;
    float exploitability = 0.0f;
    int completed_iterations = 0;
    int total_info_sets = 0;
    bool cancelled = false;
    std::string error;
    std::vector<StrategyEntry> strategies;
};

// Parse board string (e.g., "Qs9d2c") into Board
Board parse_board(const std::string& board_str) {
    Board board;
    for (size_t i = 0; i + 1 < board_str.size(); i += 2) {
        std::string card_str = board_str.substr(i, 2);
        Card c = card_from_string(card_str);
        if (c == INVALID_CARD) {
            throw std::runtime_error("Invalid card in board: " + card_str);
        }
        board.add(c);
    }
    return board;
}

// Parse hand string (e.g., "AhKh") into Hand
Hand parse_hand(const std::string& hand_str) {
    if (hand_str.size() != 4) {
        throw std::runtime_error("Invalid hand string: " + hand_str);
    }
    Card c1 = card_from_string(hand_str.substr(0, 2));
    Card c2 = card_from_string(hand_str.substr(2, 2));
    if (c1 == INVALID_CARD || c2 == INVALID_CARD) {
        throw std::runtime_error("Invalid cards in hand: " + hand_str);
    }
    return Hand(c1, c2);
}

// Solver class that maintains state for node locking
class NLHESolver {
public:
    NLHESolver(
        const std::string& board_str,
        const std::vector<std::string>& range_p0_strs,
        const std::vector<std::string>& range_p1_strs,
        float pot,
        float stack,
        const std::vector<float>& bet_sizes,
        int max_raises = 3,
        int max_runouts = 6
    ) {
        // Parse inputs
        board_ = parse_board(board_str);

        for (const auto& s : range_p0_strs) {
            range_p0_.push_back(parse_hand(s));
        }
        for (const auto& s : range_p1_strs) {
            range_p1_.push_back(parse_hand(s));
        }

        // Build config
        NLHEConfig config;
        config.board = board_;
        config.range_p0 = range_p0_;
        config.range_p1 = range_p1_;
        config.pot = pot;
        config.stack = stack;
        config.bet_sizes = bet_sizes;
        config.max_raises = max_raises;
        config.max_runouts = max_runouts;

        // Build tree
        NLHEBuilder builder(config);
        root_ = builder.build();
        stats_ = builder.stats();

        info_store_ = std::make_unique<InfoSetStore>();
        locker_ = std::make_unique<NodeLocker>(*info_store_);
    }

    PySolveResult solve(int num_iterations,
                         py::object callback = py::none(),
                         int callback_interval = 100) {
        PySolveResult result;
        result.cancelled = false;

        try {
            CFRSolver solver(root_, *info_store_, range_p0_, range_p1_, board_);

            std::atomic<bool> cancel_flag{false};
            ProgressCallback cpp_callback = nullptr;

            if (!callback.is_none()) {
                cpp_callback = [&callback, &cancel_flag](int iter, int completed,
                                                          int total, float ev) {
                    py::gil_scoped_acquire acquire;
                    try {
                        py::object ret = callback(iter, completed, total, ev);
                        if (py::isinstance<py::bool_>(ret) && !ret.cast<bool>()) {
                            cancel_flag.store(true);
                        }
                    } catch (...) {}
                };
            }

            SolveResult solve_result;
            {
                py::gil_scoped_release release;
                solve_result = solver.solve(num_iterations, cpp_callback,
                                             &cancel_flag, callback_interval);
            }

            result.ev_p0 = solve_result.ev_p0;
            result.exploitability = solve_result.exploitability;
            result.completed_iterations = solve_result.completed_iterations;
            result.cancelled = solve_result.cancelled;
            result.total_info_sets = static_cast<int>(info_store_->size());

            // Cache last EV
            last_ev_ = result.ev_p0;

        } catch (const std::exception& e) {
            result.error = e.what();
        }

        return result;
    }

    std::unordered_map<std::string, bool> apply_locks(
        const std::unordered_map<std::string, std::vector<float>>& locks
    ) {
        LockSpec lock_spec;
        for (const auto& [key, strategy] : locks) {
            lock_spec[key] = strategy;
        }

        auto lock_result = locker_->apply_locks(lock_spec);
        return lock_result.applied;
    }

    void unlock_all() {
        locker_->unlock_all();
    }

    void prepare_for_resolve() {
        locker_->prepare_for_resolve();
    }

    std::vector<StrategyEntry> get_strategies() const {
        std::vector<StrategyEntry> strategies;

        for (const auto& [key, data] : *info_store_) {
            StrategyEntry entry;
            entry.info_set_key = key;
            entry.is_locked = data.is_locked();
            entry.probabilities = data.get_average_strategy();

            // Placeholder action names
            for (size_t i = 0; i < entry.probabilities.size(); ++i) {
                entry.actions.push_back("action_" + std::to_string(i));
            }

            strategies.push_back(std::move(entry));
        }

        return strategies;
    }

    std::vector<std::string> get_info_set_keys() const {
        return info_store_->keys();
    }

    int num_info_sets() const {
        return static_cast<int>(info_store_->size());
    }

    TreeStats tree_stats() const {
        return stats_;
    }

private:
    Board board_;
    Range range_p0_;
    Range range_p1_;
    NodePtr root_;
    TreeStats stats_;
    std::unique_ptr<InfoSetStore> info_store_;
    std::unique_ptr<NodeLocker> locker_;
    float last_ev_ = 0.0f;
};

PYBIND11_MODULE(nlhe_solver_cpp, m) {
    m.doc() = "NLHE Poker CFR+ Solver - C++ Implementation";

    // StrategyEntry
    py::class_<StrategyEntry>(m, "StrategyEntry")
        .def(py::init<>())
        .def_readwrite("info_set_key", &StrategyEntry::info_set_key)
        .def_readwrite("actions", &StrategyEntry::actions)
        .def_readwrite("probabilities", &StrategyEntry::probabilities)
        .def_readwrite("is_locked", &StrategyEntry::is_locked);

    // PySolveResult
    py::class_<PySolveResult>(m, "SolveResult")
        .def(py::init<>())
        .def_readwrite("solve_id", &PySolveResult::solve_id)
        .def_readwrite("ev_p0", &PySolveResult::ev_p0)
        .def_readwrite("exploitability", &PySolveResult::exploitability)
        .def_readwrite("completed_iterations", &PySolveResult::completed_iterations)
        .def_readwrite("total_info_sets", &PySolveResult::total_info_sets)
        .def_readwrite("cancelled", &PySolveResult::cancelled)
        .def_readwrite("error", &PySolveResult::error)
        .def_readwrite("strategies", &PySolveResult::strategies);

    // TreeStats
    py::class_<TreeStats>(m, "TreeStats")
        .def(py::init<>())
        .def_readwrite("action_nodes", &TreeStats::action_nodes)
        .def_readwrite("chance_nodes", &TreeStats::chance_nodes)
        .def_readwrite("terminal_nodes", &TreeStats::terminal_nodes)
        .def_readwrite("info_sets", &TreeStats::info_sets)
        .def_readwrite("max_depth", &TreeStats::max_depth)
        .def("total_nodes", &TreeStats::total_nodes);

    // NLHESolver class
    py::class_<NLHESolver>(m, "NLHESolver")
        .def(py::init<const std::string&,
                      const std::vector<std::string>&,
                      const std::vector<std::string>&,
                      float, float,
                      const std::vector<float>&,
                      int, int>(),
             py::arg("board"),
             py::arg("range_p0"),
             py::arg("range_p1"),
             py::arg("pot"),
             py::arg("stack"),
             py::arg("bet_sizes"),
             py::arg("max_raises") = 3,
             py::arg("max_runouts") = 6)
        .def("solve", &NLHESolver::solve,
             py::arg("num_iterations"),
             py::arg("callback") = py::none(),
             py::arg("callback_interval") = 100)
        .def("apply_locks", &NLHESolver::apply_locks)
        .def("unlock_all", &NLHESolver::unlock_all)
        .def("prepare_for_resolve", &NLHESolver::prepare_for_resolve)
        .def("get_strategies", &NLHESolver::get_strategies)
        .def("get_info_set_keys", &NLHESolver::get_info_set_keys)
        .def("num_info_sets", &NLHESolver::num_info_sets)
        .def("tree_stats", &NLHESolver::tree_stats);

    // Version info
    m.attr("__version__") = "1.0.0";
}
