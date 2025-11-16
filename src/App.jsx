import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Trash2 } from 'lucide-react';

const GRID_ROWS = 20;
const GRID_COLS = 40;
const CELL_SIZE = 25;

const CELL_TYPES = {
  EMPTY: 'empty',
  WALL: 'wall',
  START: 'start',
  END: 'end',
  VISITED: 'visited',
  PATH: 'path',
  CURRENT: 'current'
};

const PathfindingVisualizer = () => {
  const [grid, setGrid] = useState([]);
  const [start, setStart] = useState({ row: 10, col: 5 });
  const [end, setEnd] = useState({ row: 10, col: 35 });
  const [isRunning, setIsRunning] = useState(false);
  const [algorithm, setAlgorithm] = useState('bfs');
  const [speed, setSpeed] = useState(10);
  const [stats, setStats] = useState({ visited: 0, pathLength: 0, time: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState('wall');
  const animationRef = useRef(null);

  useEffect(() => {
    initializeGrid();
  }, []);

  const initializeGrid = () => {
    const newGrid = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      const currentRow = [];
      for (let col = 0; col < GRID_COLS; col++) {
        currentRow.push({
          row,
          col,
          type: CELL_TYPES.EMPTY,
          distance: Infinity,
          heuristic: 0,
          parent: null,
          visited: false
        });
      }
      newGrid.push(currentRow);
    }
    newGrid[start.row][start.col].type = CELL_TYPES.START;
    newGrid[end.row][end.col].type = CELL_TYPES.END;
    setGrid(newGrid);
    setStats({ visited: 0, pathLength: 0, time: 0 });
  };

  const handleMouseDown = (row, col) => {
    if (isRunning) return;
    setIsDrawing(true);
    toggleCell(row, col);
  };

  const handleMouseEnter = (row, col) => {
    if (!isDrawing || isRunning) return;
    toggleCell(row, col);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const toggleCell = (row, col) => {
    const newGrid = grid.map(r => r.map(cell => ({ ...cell })));
    const cell = newGrid[row][col];

    if (cell.type === CELL_TYPES.START || cell.type === CELL_TYPES.END) return;

    if (drawMode === 'wall') {
      cell.type = cell.type === CELL_TYPES.WALL ? CELL_TYPES.EMPTY : CELL_TYPES.WALL;
    }
    
    setGrid(newGrid);
  };

  const clearPath = () => {
    const newGrid = grid.map(row =>
      row.map(cell => ({
        ...cell,
        type: cell.type === CELL_TYPES.VISITED || cell.type === CELL_TYPES.PATH || cell.type === CELL_TYPES.CURRENT
          ? CELL_TYPES.EMPTY
          : cell.type,
        distance: Infinity,
        heuristic: 0,
        parent: null,
        visited: false
      }))
    );
    setGrid(newGrid);
    setStats({ visited: 0, pathLength: 0, time: 0 });
  };

  const clearWalls = () => {
    const newGrid = grid.map(row =>
      row.map(cell => ({
        ...cell,
        type: cell.type === CELL_TYPES.WALL ? CELL_TYPES.EMPTY : cell.type
      }))
    );
    setGrid(newGrid);
  };

  const getNeighbors = (node) => {
    const neighbors = [];
    const { row, col } = node;
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ];

    for (const [dx, dy] of directions) {
      const newRow = row + dx;
      const newCol = col + dy;
      
      if (newRow >= 0 && newRow < GRID_ROWS && newCol >= 0 && newCol < GRID_COLS) {
        neighbors.push(grid[newRow][newCol]);
      }
    }
    return neighbors;
  };

  const heuristic = (node) => {
    return Math.abs(node.row - end.row) + Math.abs(node.col - end.col);
  };

  const reconstructPath = (endNode) => {
    const path = [];
    let current = endNode;
    while (current.parent) {
      path.unshift(current);
      current = current.parent;
    }
    return path;
  };

  const animateAlgorithm = async (visitedOrder, path) => {
    const startTime = Date.now();
    
    for (let i = 0; i < visitedOrder.length; i++) {
      if (!animationRef.current) return;
      
      await new Promise(resolve => setTimeout(resolve, 50 / speed));
      
      const node = visitedOrder[i];
      if (node.type !== CELL_TYPES.START && node.type !== CELL_TYPES.END) {
        setGrid(prevGrid => {
          const newGrid = prevGrid.map(r => r.map(c => ({ ...c })));
          newGrid[node.row][node.col].type = CELL_TYPES.VISITED;
          return newGrid;
        });
      }
      
      setStats(prev => ({ ...prev, visited: i + 1 }));
    }

    if (path.length > 0) {
      for (let i = 0; i < path.length; i++) {
        if (!animationRef.current) return;
        
        await new Promise(resolve => setTimeout(resolve, 50 / speed));
        
        const node = path[i];
        if (node.type !== CELL_TYPES.START && node.type !== CELL_TYPES.END) {
          setGrid(prevGrid => {
            const newGrid = prevGrid.map(r => r.map(c => ({ ...c })));
            newGrid[node.row][node.col].type = CELL_TYPES.PATH;
            return newGrid;
          });
        }
      }
    }

    const endTime = Date.now();
    setStats(prev => ({
      ...prev,
      pathLength: path.length,
      time: endTime - startTime
    }));
    
    setIsRunning(false);
  };

  const bfs = () => {
    const visitedOrder = [];
    const queue = [grid[start.row][start.col]];
    const visited = new Set();
    visited.add(`${start.row}-${start.col}`);
    
    grid[start.row][start.col].distance = 0;

    while (queue.length > 0) {
      const current = queue.shift();
      visitedOrder.push(current);

      if (current.row === end.row && current.col === end.col) {
        return { visitedOrder, path: reconstructPath(current) };
      }

      const neighbors = getNeighbors(current);
      for (const neighbor of neighbors) {
        const key = `${neighbor.row}-${neighbor.col}`;
        if (!visited.has(key) && neighbor.type !== CELL_TYPES.WALL) {
          visited.add(key);
          neighbor.parent = current;
          neighbor.distance = current.distance + 1;
          queue.push(neighbor);
        }
      }
    }

    return { visitedOrder, path: [] };
  };

  const dfs = () => {
    const visitedOrder = [];
    const stack = [grid[start.row][start.col]];
    const visited = new Set();

    while (stack.length > 0) {
      const current = stack.pop();
      const key = `${current.row}-${current.col}`;
      
      if (visited.has(key)) continue;
      visited.add(key);
      visitedOrder.push(current);

      if (current.row === end.row && current.col === end.col) {
        return { visitedOrder, path: reconstructPath(current) };
      }

      const neighbors = getNeighbors(current);
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.row}-${neighbor.col}`;
        if (!visited.has(neighborKey) && neighbor.type !== CELL_TYPES.WALL) {
          neighbor.parent = current;
          stack.push(neighbor);
        }
      }
    }

    return { visitedOrder, path: [] };
  };

  const dijkstra = () => {
    const visitedOrder = [];
    const unvisited = [];
    
    for (let row of grid) {
      for (let node of row) {
        unvisited.push(node);
      }
    }
    
    grid[start.row][start.col].distance = 0;

    while (unvisited.length > 0) {
      unvisited.sort((a, b) => a.distance - b.distance);
      const current = unvisited.shift();
      
      if (current.type === CELL_TYPES.WALL) continue;
      if (current.distance === Infinity) return { visitedOrder, path: [] };
      
      visitedOrder.push(current);

      if (current.row === end.row && current.col === end.col) {
        return { visitedOrder, path: reconstructPath(current) };
      }

      const neighbors = getNeighbors(current);
      for (const neighbor of neighbors) {
        if (neighbor.type !== CELL_TYPES.WALL) {
          const newDistance = current.distance + 1;
          if (newDistance < neighbor.distance) {
            neighbor.distance = newDistance;
            neighbor.parent = current;
          }
        }
      }
    }

    return { visitedOrder, path: [] };
  };

  const aStar = () => {
    const visitedOrder = [];
    const openSet = [grid[start.row][start.col]];
    const closedSet = new Set();
    
    grid[start.row][start.col].distance = 0;
    grid[start.row][start.col].heuristic = heuristic(grid[start.row][start.col]);

    while (openSet.length > 0) {
      openSet.sort((a, b) => (a.distance + a.heuristic) - (b.distance + b.heuristic));
      const current = openSet.shift();
      const key = `${current.row}-${current.col}`;
      
      if (closedSet.has(key)) continue;
      closedSet.add(key);
      visitedOrder.push(current);

      if (current.row === end.row && current.col === end.col) {
        return { visitedOrder, path: reconstructPath(current) };
      }

      const neighbors = getNeighbors(current);
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.row}-${neighbor.col}`;
        if (!closedSet.has(neighborKey) && neighbor.type !== CELL_TYPES.WALL) {
          const newDistance = current.distance + 1;
          if (newDistance < neighbor.distance) {
            neighbor.distance = newDistance;
            neighbor.heuristic = heuristic(neighbor);
            neighbor.parent = current;
            openSet.push(neighbor);
          }
        }
      }
    }

    return { visitedOrder, path: [] };
  };

  const runAlgorithm = () => {
    if (isRunning) {
      animationRef.current = false;
      setIsRunning(false);
      return;
    }

    clearPath();
    setIsRunning(true);
    animationRef.current = true;

    setTimeout(() => {
      let result;
      switch (algorithm) {
        case 'bfs':
          result = bfs();
          break;
        case 'dfs':
          result = dfs();
          break;
        case 'dijkstra':
          result = dijkstra();
          break;
        case 'astar':
          result = aStar();
          break;
        default:
          result = bfs();
      }
      animateAlgorithm(result.visitedOrder, result.path);
    }, 100);
  };

  const getCellClassName = (cell) => {
    const baseClass = "border border-gray-300 transition-all duration-100";
    switch (cell.type) {
      case CELL_TYPES.START:
        return `${baseClass} bg-green-500`;
      case CELL_TYPES.END:
        return `${baseClass} bg-red-500`;
      case CELL_TYPES.WALL:
        return `${baseClass} bg-gray-800`;
      case CELL_TYPES.VISITED:
        return `${baseClass} bg-blue-200`;
      case CELL_TYPES.PATH:
        return `${baseClass} bg-yellow-400`;
      case CELL_TYPES.CURRENT:
        return `${baseClass} bg-purple-400`;
      default:
        return `${baseClass} bg-white hover:bg-gray-100`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              🗺️ Pathfinding Visualizer
            </h1>
            <p className="text-gray-600">Watch algorithms find the shortest path in real-time</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Algorithm
              </label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                disabled={isRunning}
                className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="bfs">Breadth-First Search (BFS)</option>
                <option value="dfs">Depth-First Search (DFS)</option>
                <option value="dijkstra">Dijkstra's Algorithm</option>
                <option value="astar">A* Algorithm</option>
              </select>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Speed: {speed}x
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                disabled={isRunning}
                className="w-full"
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Draw Mode
              </label>
              <select
                value={drawMode}
                onChange={(e) => setDrawMode(e.target.value)}
                disabled={isRunning}
                className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="wall">Draw Walls</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={runAlgorithm}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-white transition-all ${
                  isRunning
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {isRunning ? <Pause size={20} /> : <Play size={20} />}
                {isRunning ? 'Stop' : 'Start'}
              </button>
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            <button
              onClick={clearPath}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw size={18} />
              Clear Path
            </button>
            <button
              onClick={clearWalls}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={18} />
              Clear Walls
            </button>
            <button
              onClick={initializeGrid}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw size={18} />
              Reset All
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.visited}</div>
              <div className="text-sm text-gray-600">Nodes Visited</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pathLength}</div>
              <div className="text-sm text-gray-600">Path Length</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{stats.time}ms</div>
              <div className="text-sm text-gray-600">Execution Time</div>
            </div>
          </div>

          <div 
            className="inline-block border-4 border-gray-800 rounded-lg overflow-hidden shadow-lg"
            onMouseLeave={handleMouseUp}
          >
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL_SIZE}px)`,
              gap: 0
            }}>
              {grid.map((row, rowIdx) =>
                row.map((cell, colIdx) => (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    className={getCellClassName(cell)}
                    style={{ width: CELL_SIZE, height: CELL_SIZE }}
                    onMouseDown={() => handleMouseDown(rowIdx, colIdx)}
                    onMouseEnter={() => handleMouseEnter(rowIdx, colIdx)}
                    onMouseUp={handleMouseUp}
                  />
                ))
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-500 border-2 border-gray-300 rounded"></div>
              <span className="text-sm font-medium">Start</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-500 border-2 border-gray-300 rounded"></div>
              <span className="text-sm font-medium">End</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-800 border-2 border-gray-300 rounded"></div>
              <span className="text-sm font-medium">Wall</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-200 border-2 border-gray-300 rounded"></div>
              <span className="text-sm font-medium">Visited</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-400 border-2 border-gray-300 rounded"></div>
              <span className="text-sm font-medium">Shortest Path</span>
            </div>
          </div>

          <div className="mt-6 bg-blue-50 p-4 rounded-lg">
            <h3 className="font-bold text-blue-900 mb-2">📝 Instructions:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Draw Walls:</strong> Click and drag on the grid</li>
              <li>• <strong>Choose Algorithm:</strong> Select from BFS, DFS, Dijkstra, or A*</li>
              <li>• <strong>Adjust Speed:</strong> Use the slider to control visualization speed</li>
              <li>• <strong>Start:</strong> Click the green Start button to run the algorithm</li>
              <li>• <strong>Clear:</strong> Use Clear Path to keep walls, or Reset All for a fresh start</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PathfindingVisualizer;
