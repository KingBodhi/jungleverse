cmake_minimum_required(VERSION 3.16)
project(nlhe_solver VERSION 1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Build type
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

# Optimization flags
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -march=native -DNDEBUG -ffast-math")
set(CMAKE_CXX_FLAGS_DEBUG "-g -O0 -DDEBUG")

# Find OpenMP
find_package(OpenMP)
if(OpenMP_CXX_FOUND)
    message(STATUS "OpenMP found - enabling parallel solver")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${OpenMP_CXX_FLAGS}")
else()
    message(STATUS "OpenMP not found - using single-threaded solver")
endif()

# Find pybind11
find_package(pybind11 REQUIRED)

# Include directories
include_directories(${CMAKE_SOURCE_DIR}/include)
include_directories(${CMAKE_SOURCE_DIR}/external)

# OMPEval source files (hand evaluator library)
set(OMPEVAL_SOURCES
    external/omp/HandEvaluator.cpp
)

# Source files
set(SOLVER_SOURCES
    src/cards.cpp
    src/evaluator.cpp
    src/game_tree.cpp
    src/info_set.cpp
    src/cfr.cpp
    src/nlhe_builder.cpp
    src/node_lock.cpp
    ${OMPEVAL_SOURCES}
)

# Python module
pybind11_add_module(nlhe_solver_cpp
    ${SOLVER_SOURCES}
    bindings/pybind_module.cpp
)

target_compile_definitions(nlhe_solver_cpp PRIVATE VERSION_INFO="${PROJECT_VERSION}")

# Optional: standalone test executable
option(BUILD_TESTS "Build test executable" OFF)
if(BUILD_TESTS)
    enable_testing()
    find_package(GTest REQUIRED)

    add_executable(solver_tests
        ${SOLVER_SOURCES}
        tests/test_solver.cpp
    )
    target_link_libraries(solver_tests GTest::gtest_main)

    include(GoogleTest)
    gtest_discover_tests(solver_tests)
endif()
