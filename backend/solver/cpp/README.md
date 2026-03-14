# NLHE C++ Solver

High-performance CFR+ solver for No-Limit Hold'em postflop subgames.

## Overview

This C++ implementation provides significant speedup over the Python solver for NLHE computations. It integrates seamlessly with the existing FastAPI backend via pybind11 bindings.

## Building

### Local Development (requires CMake and pybind11)

```bash
# Install dependencies (macOS)
brew install cmake
pip install pybind11[global]

# Build
./build.sh

# Test import
cd .. && python -c "import nlhe_solver_cpp; print(nlhe_solver_cpp.__version__)"
```

### Docker (recommended)

The Dockerfile automatically builds the C++ solver:

```bash
cd /path/to/backend/solver
docker build -t jungleverse-solver .
```

## Usage

The C++ solver is automatically used for `nlhe_subgame` variant when available:

```python
from pulse.solver.nlhe_cpp import NLHECppSolver, NLHECppConfig

# Create config
config = NLHECppConfig(
    board="Qs9d2c",
    range_p0="AA,KK,AKs",
    range_p1="QQ,JJ,AQs",
    pot=100.0,
    stack=200.0,
    bet_sizes=[0.5, 1.0],
    max_raises=3,
    max_runouts=6
)

# Create solver and run
solver = NLHECppSolver(config)
result = solver.solve(
    num_iterations=1000,
    callback=lambda iter, completed, total, ev: print(f"Iter {completed}: EV={ev:.4f}"),
    callback_interval=100
)

print(f"EV: {result.ev_p0:.4f}")
print(f"Exploitability: {result.exploitability:.4f}")

# Apply node locks
locks_applied = solver.apply_locks({
    "AsKs|Qs9d2c|x": [0.0, 1.0]  # Force betting
})

# Re-solve
solver.prepare_for_resolve()
result2 = solver.solve(1000)
```

## Architecture

```
cpp/
├── include/
│   ├── cards.hpp          # Card encoding (0-51)
│   ├── evaluator.hpp      # OMPEval wrapper for hand evaluation
│   ├── game_tree.hpp      # ActionNode, ChanceNode, TerminalNode
│   ├── info_set.hpp       # Regret/strategy storage
│   ├── cfr.hpp            # CFR+ algorithm
│   ├── nlhe_builder.hpp   # NLHE tree construction
│   └── node_lock.hpp      # Node locking for exploitative play
├── src/                   # Implementations
├── bindings/
│   └── pybind_module.cpp  # Python bindings
├── external/
│   └── omp/               # OMPEval hand evaluator
└── tests/
    └── test_solver.cpp    # Google Test suite
```

## Key Features

- **Fast hand evaluation**: Uses OMPEval (sub-microsecond 7-card evaluation)
- **Progress callbacks**: Report iteration progress back to Python
- **GIL release**: Computation runs without Python GIL for true parallelism
- **Node locking**: Lock strategies and re-solve for exploitative analysis
- **Cancellation support**: Cancel long-running solves gracefully

## Future Enhancements

- **OpenMP parallelization**: Parallelize CFR traversal across hands
- **GPU offloading**: CUDA kernels for batch hand evaluation
- **Memory optimization**: SoA layout for better cache performance
