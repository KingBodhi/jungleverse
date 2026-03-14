FROM python:3.12-slim

WORKDIR /app

# Install build dependencies including OpenMP for parallel solving
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    cmake \
    libomp-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies (including pybind11)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt pybind11[global]

# Copy C++ source and build
COPY cpp/ cpp/
RUN cd cpp && \
    mkdir -p build && \
    cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release .. && \
    make -j$(nproc) && \
    cp nlhe_solver_cpp*.so /app/

# Copy application code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Run with auto-reload disabled for production
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
