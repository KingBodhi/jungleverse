#!/bin/bash
# Build script for local development

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "Building NLHE C++ solver..."

# Get pybind11 cmake dir
PYBIND11_DIR=$(python3 -c "import pybind11; print(pybind11.get_cmake_dir())")
echo "Using pybind11 from: $PYBIND11_DIR"

# Create build directory
mkdir -p build
cd build

# Configure and build
cmake -DCMAKE_BUILD_TYPE=Release -Dpybind11_DIR="$PYBIND11_DIR" ..
make -j$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 2)

# Copy module to parent solver directory
echo "Copying module to solver directory..."
cp nlhe_solver_cpp*.so ../../ 2>/dev/null || cp nlhe_solver_cpp*.dylib ../../ 2>/dev/null || true

echo ""
echo "Build complete!"
echo ""
echo "To test the module:"
echo "  cd ../.. && python3 -c 'import nlhe_solver_cpp; print(nlhe_solver_cpp.__version__)'"
