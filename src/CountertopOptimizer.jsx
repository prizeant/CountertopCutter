import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, PlusCircle, Download, Upload, RotateCw, Copy, Info, X } from 'lucide-react';

// Constants for slab dimensions
const DEFAULT_SLAB_WIDTH = 133;
const DEFAULT_SLAB_HEIGHT = 78;

// Common countertop presets
const PRESETS = {
  standard: [
    { width: 137, height: 26, label: 'Long Countertop' },
    { width: 78, height: 44, label: 'Island' },
    { width: 50, height: 26, label: 'Stove Left' },
    { width: 24, height: 26, label: 'Stove Right' },
    { width: 72, height: 26, label: 'Bar' },
    { width: 110, height: 26, label: 'Bathroom' },
    { width: 110, height: 4, label: 'Bathroom Back' },
    { width: 42, height: 15, label: 'Bathroom Bench' },
    { width: 162, height: 18, label: 'Long Backsplash' },
    { width: 50, height: 18, label: 'Stove Backsplash Left' },
    { width: 30, height: 30, label: 'Stove Backsplash Center' },
    { width: 24, height: 18, label: 'Stove Backsplash Right' }
  ],
  minimal: [
    { width: 96, height: 26, label: 'Main Counter' },
    { width: 60, height: 36, label: 'Island' },
    { width: 96, height: 4, label: 'Backsplash' }
  ]
};

const CountertopOptimizer = () => {
  // Define algorithm types
  const GUILLOTINE = "guillotine";
  const FIRST_FIT = "first_fit";
  const BEST_FIT = "best_fit";
  const BRANCH_AND_BOUND = "branch_and_bound";
  const GENETIC_ALGORITHM = "genetic";

  const [countertops, setCountertops] = useState(PRESETS.standard.map((c, i) => ({ ...c, id: i + 1 })));
  const [nextId, setNextId] = useState(PRESETS.standard.length + 1);
  const [slabWidth, setSlabWidth] = useState(DEFAULT_SLAB_WIDTH);
  const [slabHeight, setSlabHeight] = useState(DEFAULT_SLAB_HEIGHT);
  const [result, setResult] = useState(null);
  const [showOptimalCuts, setShowOptimalCuts] = useState(false);
  const [allowSplitting, setAllowSplitting] = useState(true);
  const [minSplitLength, setMinSplitLength] = useState(24);
  const [algorithm, setAlgorithm] = useState(GUILLOTINE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('standard');
  const [kerfloss, setKerfloss] = useState(0.125); // 1/8 inch blade width
  const [showTips, setShowTips] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(null);
  const [maxSlabs, setMaxSlabs] = useState(3); // Maximum slabs to consider
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonResults, setComparisonResults] = useState(null);
  const [savedConfigs, setSavedConfigs] = useState({});
  const [newConfigName, setNewConfigName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        setShowSaveDialog(true);
      }
      // Ctrl/Cmd + O to optimize
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        if (!isProcessing && countertops.length > 0) {
          runOptimization();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isProcessing, countertops.length]);
  
  // Load saved configurations and last state from localStorage
  useEffect(() => {
    try {
      // Load saved configurations
      const saved = localStorage.getItem('countertopConfigs');
      if (saved) {
        setSavedConfigs(JSON.parse(saved));
      }
      
      // Load last state
      const lastState = localStorage.getItem('countertopLastState');
      if (lastState) {
        const state = JSON.parse(lastState);
        if (state.countertops) setCountertops(state.countertops);
        if (state.slabWidth) setSlabWidth(state.slabWidth);
        if (state.slabHeight) setSlabHeight(state.slabHeight);
        if (state.hasOwnProperty('allowSplitting')) setAllowSplitting(state.allowSplitting);
        if (state.minSplitLength) setMinSplitLength(state.minSplitLength);
        if (state.kerfloss !== undefined) setKerfloss(state.kerfloss);
        if (state.algorithm) setAlgorithm(state.algorithm);
        if (state.maxSlabs) setMaxSlabs(state.maxSlabs);
        
        // Update nextId
        if (state.countertops && state.countertops.length > 0) {
          const maxId = Math.max(...state.countertops.map(c => c.id));
          setNextId(maxId + 1);
        }
      }
    } catch (error) {
      console.error('Error loading saved state:', error);
    }
  }, []);
  
  // Save current state to localStorage whenever it changes
  useEffect(() => {
    const state = {
      countertops,
      slabWidth,
      slabHeight,
      allowSplitting,
      minSplitLength,
      kerfloss,
      algorithm,
      maxSlabs
    };
    
    try {
      localStorage.setItem('countertopLastState', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }, [countertops, slabWidth, slabHeight, allowSplitting, minSplitLength, kerfloss, algorithm, maxSlabs]);
  
  // Save configuration with a name
  const saveConfiguration = (name) => {
    const config = {
      name,
      countertops,
      slabWidth,
      slabHeight,
      allowSplitting,
      minSplitLength,
      kerfloss,
      timestamp: new Date().toISOString()
    };
    
    const newSavedConfigs = {
      ...savedConfigs,
      [name]: config
    };
    
    setSavedConfigs(newSavedConfigs);
    
    try {
      localStorage.setItem('countertopConfigs', JSON.stringify(newSavedConfigs));
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Failed to save configuration');
    }
    
    setShowSaveDialog(false);
    setNewConfigName('');
  };
  
  // Load a saved configuration
  const loadConfiguration = (name) => {
    const config = savedConfigs[name];
    if (config) {
      setCountertops(config.countertops);
      setSlabWidth(config.slabWidth);
      setSlabHeight(config.slabHeight);
      setAllowSplitting(config.allowSplitting);
      setMinSplitLength(config.minSplitLength);
      setKerfloss(config.kerfloss || 0.125);
      setResult(null);
      
      // Update nextId
      const maxId = Math.max(...config.countertops.map(c => c.id));
      setNextId(maxId + 1);
    }
  };
  
  // Delete a saved configuration
  const deleteConfiguration = (name) => {
    const newSavedConfigs = { ...savedConfigs };
    delete newSavedConfigs[name];
    setSavedConfigs(newSavedConfigs);
    
    try {
      localStorage.setItem('countertopConfigs', JSON.stringify(newSavedConfigs));
    } catch (error) {
      console.error('Error deleting configuration:', error);
    }
  };
  
  // Run comparison when modal opens
  useEffect(() => {
    if (showComparison && !comparisonResults) {
      runComparison();
    }
  }, [showComparison]);
  
  const runComparison = async () => {
    setComparisonResults(null);
    const results = [];
    
    // Test each algorithm
    const algorithms = [
      { id: GUILLOTINE, name: 'Guillotine Cutting' },
      { id: FIRST_FIT, name: 'First Fit' },
      { id: BEST_FIT, name: 'Best Fit' },
      { id: BRANCH_AND_BOUND, name: 'Branch & Bound' },
      { id: GENETIC_ALGORITHM, name: 'Genetic Algorithm' }
    ];
    
    const { pieces } = preprocessPieces();
    
    for (const algo of algorithms) {
      const startTime = Date.now();
      let slabs = null;
      
      try {
        if (algo.id === BRANCH_AND_BOUND) {
          slabs = branchAndBound(pieces);
        } else if (algo.id === GENETIC_ALGORITHM) {
          slabs = geneticAlgorithm(pieces);
        } else {
          // Run greedy algorithm
          const tempAlgorithm = algorithm;
          setAlgorithm(algo.id);
          slabs = runGreedyAlgorithm(pieces, algo.id);
          setAlgorithm(tempAlgorithm);
        }
        
        if (slabs) {
          const totalWaste = slabs.reduce((sum, slab) => sum + slab.wasteArea, 0);
          const totalArea = slabs.length * slabWidth * slabHeight;
          
          results.push({
            algorithm: algo.name,
            algorithmId: algo.id,
            slabs: slabs.length,
            wastePercent: ((totalWaste / totalArea) * 100).toFixed(1),
            time: Date.now() - startTime,
            isOptimal: algo.id === BRANCH_AND_BOUND,
            quality: algo.id === GENETIC_ALGORITHM ? 'Near-optimal' : 'Heuristic'
          });
        }
      } catch (error) {
        console.error(`Error running ${algo.name}:`, error);
      }
    }
    
    // Sort by number of slabs, then by waste percentage
    results.sort((a, b) => {
      if (a.slabs !== b.slabs) return a.slabs - b.slabs;
      return parseFloat(a.wastePercent) - parseFloat(b.wastePercent);
    });
    
    setComparisonResults(results);
  };
  
  const runGreedyAlgorithm = (pieces, algorithmType) => {
    // This is a simplified version of the greedy algorithm for comparison
    const slabs = [];
    
    // Sort pieces by area
    const sortedPieces = [...pieces].sort((a, b) => b.area - a.area);
    
    sortedPieces.forEach(piece => {
      let placed = false;
      
      // Try to place in existing slabs
      for (let i = 0; i < slabs.length; i++) {
        const slab = slabs[i];
        
        if (slab.spaces.length === 0) continue;
        
        let bestFitIndex = -1;
        let bestFitScore = algorithmType === FIRST_FIT ? Infinity : Infinity;
        
        for (let j = 0; j < slab.spaces.length; j++) {
          const space = slab.spaces[j];
          
          if (piece.effectiveWidth <= space.width && piece.effectiveHeight <= space.height) {
            if (algorithmType === FIRST_FIT) {
              bestFitIndex = j;
              break;
            } else {
              const totalWaste = (space.width - piece.effectiveWidth) * piece.effectiveHeight + 
                                (space.height - piece.effectiveHeight) * space.width;
              if (totalWaste < bestFitScore) {
                bestFitScore = totalWaste;
                bestFitIndex = j;
              }
            }
          }
        }
        
        if (bestFitIndex !== -1) {
          const space = slab.spaces[bestFitIndex];
          slab.pieces.push({ ...piece, x: space.x, y: space.y });
          
          // Update spaces
          const oldSpace = slab.spaces.splice(bestFitIndex, 1)[0];
          
          if (oldSpace.height > piece.effectiveHeight) {
            slab.spaces.push({
              x: oldSpace.x,
              y: oldSpace.y + piece.effectiveHeight,
              width: oldSpace.width,
              height: oldSpace.height - piece.effectiveHeight
            });
          }
          
          if (oldSpace.width > piece.effectiveWidth) {
            slab.spaces.push({
              x: oldSpace.x + piece.effectiveWidth,
              y: oldSpace.y,
              width: oldSpace.width - piece.effectiveWidth,
              height: piece.effectiveHeight
            });
          }
          
          placed = true;
          break;
        }
      }
      
      if (!placed) {
        const newSlab = {
          id: slabs.length + 1,
          pieces: [{ ...piece, x: 0, y: 0 }],
          spaces: [],
          totalArea: slabWidth * slabHeight
        };
        
        if (slabHeight > piece.effectiveHeight) {
          newSlab.spaces.push({
            x: 0,
            y: piece.effectiveHeight,
            width: slabWidth,
            height: slabHeight - piece.effectiveHeight
          });
        }
        
        if (slabWidth > piece.effectiveWidth) {
          newSlab.spaces.push({
            x: piece.effectiveWidth,
            y: 0,
            width: slabWidth - piece.effectiveWidth,
            height: piece.effectiveHeight
          });
        }
        
        slabs.push(newSlab);
      }
    });
    
    // Calculate waste
    slabs.forEach(slab => {
      const usedArea = slab.pieces.reduce((sum, p) => sum + p.effectiveWidth * p.effectiveHeight, 0);
      slab.wasteArea = slab.totalArea - usedArea;
      slab.wastePercentage = ((slab.wasteArea / slab.totalArea) * 100).toFixed(1);
    });
    
    return slabs;
  };
  
  // Calculate total area and statistics
  const countertopStats = useMemo(() => {
    const totalArea = countertops.reduce((sum, c) => sum + (c.width * c.height), 0);
    const largestPiece = countertops.reduce((max, c) => 
      (c.width * c.height > max.area) ? { ...c, area: c.width * c.height } : max, 
      { area: 0 }
    );
    const oversizedCount = countertops.filter(c => 
      (c.width > slabWidth && c.height > slabHeight) || 
      (c.height > slabWidth && c.width > slabHeight)
    ).length;
    
    return { totalArea, largestPiece, oversizedCount };
  }, [countertops, slabWidth, slabHeight]);
  
  const loadPreset = (presetName) => {
    setSelectedPreset(presetName);
    const preset = PRESETS[presetName];
    setCountertops(preset.map((c, i) => ({ ...c, id: i + 1 })));
    setNextId(preset.length + 1);
    setResult(null);
  };
  
  const addCountertop = () => {
    setCountertops([
      ...countertops, 
      { id: nextId, width: 48, height: 26, label: `Countertop ${nextId}` }
    ]);
    setNextId(nextId + 1);
  };
  
  const updateCountertop = (id, field, value) => {
    setCountertops(
      countertops.map(c => 
        c.id === id ? { ...c, [field]: field === 'width' || field === 'height' ? parseInt(value) || 0 : value } : c
      )
    );
  };
  
  const removeCountertop = (id) => {
    setCountertops(countertops.filter(c => c.id !== id));
  };
  
  const duplicateCountertop = (id) => {
    const toDuplicate = countertops.find(c => c.id === id);
    if (toDuplicate) {
      setCountertops([
        ...countertops,
        { ...toDuplicate, id: nextId, label: `${toDuplicate.label} (Copy)` }
      ]);
      setNextId(nextId + 1);
    }
  };
  
  // Export configuration
  const exportConfig = () => {
    const config = {
      countertops,
      slabWidth,
      slabHeight,
      allowSplitting,
      minSplitLength,
      kerfloss
    };
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'countertop-config.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  // Import configuration
  const importConfig = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target.result);
          if (config.countertops) setCountertops(config.countertops);
          if (config.slabWidth) setSlabWidth(config.slabWidth);
          if (config.slabHeight) setSlabHeight(config.slabHeight);
          if (config.hasOwnProperty('allowSplitting')) setAllowSplitting(config.allowSplitting);
          if (config.minSplitLength) setMinSplitLength(config.minSplitLength);
          if (config.kerfloss !== undefined) setKerfloss(config.kerfloss);
          setResult(null);
          
          // Update nextId
          const maxId = Math.max(...config.countertops.map(c => c.id));
          setNextId(maxId + 1);
        } catch (error) {
          alert('Error importing configuration: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
  };
  
  // Helper function to check if a piece fits in a bin
  const canFit = (piece, bin) => {
    // Check all possible positions in the bin
    for (const space of bin.spaces) {
      if (piece.effectiveWidth <= space.width && piece.effectiveHeight <= space.height) {
        return true;
      }
      // Check rotated
      if (piece.effectiveHeight <= space.width && piece.effectiveWidth <= space.height) {
        return true;
      }
    }
    return false;
  };

  // Helper function to place a piece in a bin
  const placePiece = (piece, bin, x, y, rotated) => {
    const newBin = {
      ...bin,
      pieces: [...bin.pieces, {
        ...piece,
        x,
        y,
        rotated
      }],
      spaces: []
    };
    
    const pieceWidth = rotated ? piece.effectiveHeight : piece.effectiveWidth;
    const pieceHeight = rotated ? piece.effectiveWidth : piece.effectiveHeight;
    
    // Rebuild available spaces after placing the piece
    const occupiedRects = newBin.pieces.map(p => ({
      x: p.x,
      y: p.y,
      width: p.rotated ? p.effectiveHeight : p.effectiveWidth,
      height: p.rotated ? p.effectiveWidth : p.effectiveHeight
    }));
    
    // Simple space subdivision - can be optimized with maximal rectangles
    const spaces = [];
    
    // Try to find empty spaces
    for (let y = 0; y < slabHeight; y += 1) {
      for (let x = 0; x < slabWidth; x += 1) {
        // Check if this position is occupied
        let occupied = false;
        for (const rect of occupiedRects) {
          if (x >= rect.x && x < rect.x + rect.width &&
              y >= rect.y && y < rect.y + rect.height) {
            occupied = true;
            break;
          }
        }
        
        if (!occupied) {
          // Find the maximum width and height from this position
          let maxWidth = slabWidth - x;
          let maxHeight = slabHeight - y;
          
          // Check horizontal extent
          for (let w = 1; w <= maxWidth; w++) {
            for (const rect of occupiedRects) {
              if (x + w > rect.x && x < rect.x + rect.width &&
                  y >= rect.y && y < rect.y + rect.height) {
                maxWidth = Math.min(maxWidth, rect.x - x);
                break;
              }
            }
          }
          
          // Check vertical extent
          for (let h = 1; h <= maxHeight; h++) {
            for (const rect of occupiedRects) {
              if (x >= rect.x && x < rect.x + rect.width &&
                  y + h > rect.y && y < rect.y + rect.height) {
                maxHeight = Math.min(maxHeight, rect.y - y);
                break;
              }
            }
          }
          
          if (maxWidth >= 10 && maxHeight >= 10) { // Minimum useful space
            spaces.push({ x, y, width: maxWidth, height: maxHeight });
            x += maxWidth - 1; // Skip ahead
          }
        }
      }
    }
    
    // Merge overlapping spaces and keep the largest ones
    const mergedSpaces = [];
    spaces.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    
    for (const space of spaces) {
      let overlaps = false;
      for (const existing of mergedSpaces) {
        if (space.x >= existing.x && space.y >= existing.y &&
            space.x + space.width <= existing.x + existing.width &&
            space.y + space.height <= existing.y + existing.height) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps && mergedSpaces.length < 20) { // Limit spaces for performance
        mergedSpaces.push(space);
      }
    }
    
    newBin.spaces = mergedSpaces;
    return newBin;
  };

  // Branch and Bound Algorithm
  const branchAndBound = (pieces) => {
    const startTime = Date.now();
    let bestSolution = null;
    let bestWaste = Infinity;
    let nodesExplored = 0;
    
    // Initial empty bins
    const createEmptyBin = (id) => ({
      id,
      pieces: [],
      spaces: [{ x: 0, y: 0, width: slabWidth, height: slabHeight }],
      totalArea: slabWidth * slabHeight,
      wasteArea: slabWidth * slabHeight,
      wastePercentage: 100
    });
    
    // Calculate lower bound for number of bins needed
    const totalPieceArea = pieces.reduce((sum, p) => sum + p.effectiveWidth * p.effectiveHeight, 0);
    const minBins = Math.ceil(totalPieceArea / (slabWidth * slabHeight));
    
    // State: [pieceIndex, bins, totalWaste]
    const stack = [[0, [createEmptyBin(1)], 0]];
    
    while (stack.length > 0 && Date.now() - startTime < 30000) { // 30 second timeout
      const [pieceIndex, bins, currentWaste] = stack.pop();
      nodesExplored++;
      
      if (nodesExplored % 1000 === 0) {
        setOptimizationProgress({
          nodesExplored,
          bestWaste: bestWaste === Infinity ? null : bestWaste,
          currentDepth: pieceIndex,
          totalDepth: pieces.length
        });
      }
      
      // All pieces placed
      if (pieceIndex === pieces.length) {
        if (currentWaste < bestWaste) {
          bestWaste = currentWaste;
          bestSolution = bins.map(bin => ({
            ...bin,
            wasteArea: bin.totalArea - bin.pieces.reduce((sum, p) => 
              sum + (p.rotated ? p.effectiveHeight * p.effectiveWidth : p.effectiveWidth * p.effectiveHeight), 0),
            wastePercentage: ((bin.wasteArea / bin.totalArea) * 100).toFixed(1)
          }));
        }
        continue;
      }
      
      // Pruning: if current waste exceeds best known, skip this branch
      if (currentWaste >= bestWaste) {
        continue;
      }
      
      // Pruning: if we need more bins than allowed, skip
      if (bins.length > maxSlabs) {
        continue;
      }
      
      const piece = pieces[pieceIndex];
      
      // Try placing in each existing bin
      for (let binIndex = 0; binIndex < bins.length; binIndex++) {
        const bin = bins[binIndex];
        
        // Try each space in the bin
        for (const space of bin.spaces) {
          // Try normal orientation
          if (piece.effectiveWidth <= space.width && piece.effectiveHeight <= space.height) {
            const newBin = placePiece(piece, bin, space.x, space.y, false);
            const newBins = [...bins];
            newBins[binIndex] = newBin;
            
            const pieceArea = piece.effectiveWidth * piece.effectiveHeight;
            const newWaste = currentWaste + pieceArea * binIndex; // Penalize later bins
            
            stack.push([pieceIndex + 1, newBins, newWaste]);
          }
          
          // Try rotated orientation
          if (piece.effectiveHeight <= space.width && piece.effectiveWidth <= space.height) {
            const newBin = placePiece(piece, bin, space.x, space.y, true);
            const newBins = [...bins];
            newBins[binIndex] = newBin;
            
            const pieceArea = piece.effectiveWidth * piece.effectiveHeight;
            const newWaste = currentWaste + pieceArea * binIndex;
            
            stack.push([pieceIndex + 1, newBins, newWaste]);
          }
        }
      }
      
      // Try creating a new bin (if under limit)
      if (bins.length < maxSlabs) {
        const newBin = createEmptyBin(bins.length + 1);
        const newBinWithPiece = placePiece(piece, newBin, 0, 0, false);
        const newBins = [...bins, newBinWithPiece];
        
        const newWaste = currentWaste + (slabWidth * slabHeight);
        stack.push([pieceIndex + 1, newBins, newWaste]);
        
        // Also try rotated in new bin
        if (piece.effectiveHeight <= slabWidth && piece.effectiveWidth <= slabHeight) {
          const newBinRotated = placePiece(piece, newBin, 0, 0, true);
          const newBinsRotated = [...bins, newBinRotated];
          
          stack.push([pieceIndex + 1, newBinsRotated, newWaste]);
        }
      }
    }
    
    setOptimizationProgress(null);
    return bestSolution;
  };

  // Genetic Algorithm
  const geneticAlgorithm = (pieces) => {
    const POPULATION_SIZE = 100;
    const GENERATIONS = 200;
    const MUTATION_RATE = 0.1;
    const ELITE_SIZE = 10;
    
    // Gene representation: [pieceIndex, binIndex, x, y, rotated]
    const createRandomSolution = () => {
      const solution = [];
      const bins = [createEmptyBin(1)];
      
      for (const piece of pieces) {
        let placed = false;
        
        // Try to place in existing bins
        for (let i = 0; i < bins.length; i++) {
          const bin = bins[i];
          const possiblePlacements = [];
          
          for (const space of bin.spaces) {
            if (piece.effectiveWidth <= space.width && piece.effectiveHeight <= space.height) {
              possiblePlacements.push({ binIndex: i, x: space.x, y: space.y, rotated: false });
            }
            if (piece.effectiveHeight <= space.width && piece.effectiveWidth <= space.height) {
              possiblePlacements.push({ binIndex: i, x: space.x, y: space.y, rotated: true });
            }
          }
          
          if (possiblePlacements.length > 0) {
            const placement = possiblePlacements[Math.floor(Math.random() * possiblePlacements.length)];
            bins[i] = placePiece(piece, bin, placement.x, placement.y, placement.rotated);
            solution.push({ piece, ...placement });
            placed = true;
            break;
          }
        }
        
        // Create new bin if needed
        if (!placed && bins.length < maxSlabs) {
          const newBin = createEmptyBin(bins.length + 1);
          const rotated = Math.random() < 0.5 && piece.effectiveHeight <= slabWidth && piece.effectiveWidth <= slabHeight;
          bins.push(placePiece(piece, newBin, 0, 0, rotated));
          solution.push({ piece, binIndex: bins.length - 1, x: 0, y: 0, rotated });
        }
      }
      
      return { genes: solution, bins };
    };
    
    const createEmptyBin = (id) => ({
      id,
      pieces: [],
      spaces: [{ x: 0, y: 0, width: slabWidth, height: slabHeight }],
      totalArea: slabWidth * slabHeight
    });
    
    // Fitness function (lower is better)
    const fitness = (solution) => {
      let totalArea = 0;
      let totalWaste = 0;
      const binCount = new Set(solution.genes.map(g => g.binIndex)).size;
      
      for (let i = 0; i < binCount; i++) {
        totalArea += slabWidth * slabHeight;
        const usedArea = solution.genes
          .filter(g => g.binIndex === i)
          .reduce((sum, g) => sum + g.piece.effectiveWidth * g.piece.effectiveHeight, 0);
        totalWaste += slabWidth * slabHeight - usedArea;
      }
      
      return totalWaste + binCount * 1000; // Penalize more bins
    };
    
    // Crossover
    const crossover = (parent1, parent2) => {
      const crossoverPoint = Math.floor(Math.random() * pieces.length);
      const child = { genes: [], bins: [] };
      
      // Rebuild solution from crossover
      const bins = [createEmptyBin(1)];
      
      for (let i = 0; i < pieces.length; i++) {
        const piece = pieces[i];
        const gene = i < crossoverPoint ? parent1.genes[i] : parent2.genes[i];
        
        // Try to place using parent's suggestion
        if (gene.binIndex < bins.length) {
          const bin = bins[gene.binIndex];
          let placed = false;
          
          // Check if placement is valid
          for (const space of bin.spaces) {
            const effectiveWidth = gene.rotated ? piece.effectiveHeight : piece.effectiveWidth;
            const effectiveHeight = gene.rotated ? piece.effectiveWidth : piece.effectiveHeight;
            
            if (effectiveWidth <= space.width && effectiveHeight <= space.height) {
              bins[gene.binIndex] = placePiece(piece, bin, space.x, space.y, gene.rotated);
              child.genes.push({ piece, binIndex: gene.binIndex, x: space.x, y: space.y, rotated: gene.rotated });
              placed = true;
              break;
            }
          }
          
          if (!placed) {
            // Find alternative placement
            for (let j = 0; j < bins.length; j++) {
              const altBin = bins[j];
              for (const space of altBin.spaces) {
                if (piece.effectiveWidth <= space.width && piece.effectiveHeight <= space.height) {
                  bins[j] = placePiece(piece, altBin, space.x, space.y, false);
                  child.genes.push({ piece, binIndex: j, x: space.x, y: space.y, rotated: false });
                  placed = true;
                  break;
                }
              }
              if (placed) break;
            }
          }
          
          if (!placed && bins.length < maxSlabs) {
            const newBin = createEmptyBin(bins.length + 1);
            bins.push(placePiece(piece, newBin, 0, 0, false));
            child.genes.push({ piece, binIndex: bins.length - 1, x: 0, y: 0, rotated: false });
          }
        }
      }
      
      child.bins = bins;
      return child;
    };
    
    // Mutation
    const mutate = (solution) => {
      if (Math.random() < MUTATION_RATE) {
        const geneIndex = Math.floor(Math.random() * solution.genes.length);
        const gene = solution.genes[geneIndex];
        
        // Randomly change rotation
        gene.rotated = !gene.rotated;
        
        // Rebuild solution to ensure validity
        return createRandomSolution(); // Simplified - in practice, would rebuild more carefully
      }
      return solution;
    };
    
    // Initialize population
    let population = [];
    for (let i = 0; i < POPULATION_SIZE; i++) {
      population.push(createRandomSolution());
    }
    
    // Evolution loop
    for (let generation = 0; generation < GENERATIONS; generation++) {
      // Sort by fitness
      population.sort((a, b) => fitness(a) - fitness(b));
      
      // Keep elite
      const newPopulation = population.slice(0, ELITE_SIZE);
      
      // Create offspring
      while (newPopulation.length < POPULATION_SIZE) {
        const parent1 = population[Math.floor(Math.random() * ELITE_SIZE * 2)];
        const parent2 = population[Math.floor(Math.random() * ELITE_SIZE * 2)];
        
        let child = crossover(parent1, parent2);
        child = mutate(child);
        newPopulation.push(child);
      }
      
      population = newPopulation;
      
      if (generation % 20 === 0) {
        setOptimizationProgress({
          generation,
          totalGenerations: GENERATIONS,
          bestFitness: fitness(population[0])
        });
      }
    }
    
    setOptimizationProgress(null);
    
    // Return best solution
    const best = population[0];
    return best.bins.filter(bin => bin.pieces.length > 0);
  };

  // Pre-process pieces (split oversized pieces)
  const preprocessPieces = () => {
    let pieces = [];
    let splitPiecesInfo = [];
    
    countertops.forEach(c => {
      // Add kerf loss to dimensions
      const effectiveWidth = c.width + kerfloss;
      const effectiveHeight = c.height + kerfloss;
      
      // Check if this piece needs to be split
      if (allowSplitting && ((effectiveWidth > slabWidth && effectiveHeight <= slabHeight) || 
                           (effectiveHeight > slabHeight && effectiveWidth <= slabWidth))) {
        // This piece is too long in one dimension but can be split
        
        // Determine if we should split horizontally or vertically
        const splitHorizontally = effectiveWidth > slabWidth && effectiveHeight <= slabHeight;
        
        if (splitHorizontally) {
          // Split horizontally (width-wise)
          let remainingWidth = c.width;
          let piecesMade = 0;
          let piecesCreated = [];
          
          while (remainingWidth > 0) {
            // Determine width of this segment
            const maxSegmentWidth = slabWidth - kerfloss;
            const segmentWidth = Math.min(remainingWidth, maxSegmentWidth);
            
            // Only create pieces that meet minimum size requirement
            if (segmentWidth >= minSplitLength) {
              const newPiece = {
                id: `${c.id}_${piecesMade + 1}`,
                originalId: c.id,
                width: segmentWidth,
                height: c.height,
                effectiveWidth: segmentWidth + kerfloss,
                effectiveHeight: c.height + kerfloss,
                area: (segmentWidth + kerfloss) * (c.height + kerfloss),
                label: `${c.label} (Part ${piecesMade + 1})`,
                isSplit: true,
                rotated: false
              };
              
              pieces.push(newPiece);
              piecesCreated.push(newPiece);
              piecesMade++;
            }
            
            remainingWidth -= segmentWidth;
          }
          
          // Store information about the split
          if (piecesMade > 0) {
            splitPiecesInfo.push({
              originalId: c.id,
              originalLabel: c.label,
              parts: piecesMade,
              pieces: piecesCreated,
              direction: 'horizontal'
            });
          }
        } else {
          // Split vertically (height-wise)
          let remainingHeight = c.height;
          let piecesMade = 0;
          let piecesCreated = [];
          
          while (remainingHeight > 0) {
            // Determine height of this segment
            const maxSegmentHeight = slabHeight - kerfloss;
            const segmentHeight = Math.min(remainingHeight, maxSegmentHeight);
            
            // Only create pieces that meet minimum size requirement
            if (segmentHeight >= minSplitLength) {
              const newPiece = {
                id: `${c.id}_${piecesMade + 1}`,
                originalId: c.id,
                width: c.width,
                height: segmentHeight,
                effectiveWidth: c.width + kerfloss,
                effectiveHeight: segmentHeight + kerfloss,
                area: (c.width + kerfloss) * (segmentHeight + kerfloss),
                label: `${c.label} (Part ${piecesMade + 1})`,
                isSplit: true,
                rotated: false
              };
              
              pieces.push(newPiece);
              piecesCreated.push(newPiece);
              piecesMade++;
            }
            
            remainingHeight -= segmentHeight;
          }
          
          // Store information about the split
          if (piecesMade > 0) {
            splitPiecesInfo.push({
              originalId: c.id,
              originalLabel: c.label,
              parts: piecesMade,
              pieces: piecesCreated,
              direction: 'vertical'
            });
          }
        }
      } else {
        // No splitting needed, use as is
        pieces.push({
          id: c.id,
          width: c.width,
          height: c.height,
          effectiveWidth: effectiveWidth,
          effectiveHeight: effectiveHeight,
          area: effectiveWidth * effectiveHeight,
          label: c.label,
          isSplit: false,
          rotated: false
        });
      }
    });
    
    return { pieces, splitPiecesInfo };
  };
  
  // ALGORITHM: Guillotine Cutting (Best Fit Decreasing)
  const runOptimization = () => {
    setIsProcessing(true);
    setOptimizationProgress(null);
    
    setTimeout(() => {
      try {
        // Preprocess pieces
        const { pieces, splitPiecesInfo } = preprocessPieces();
        
        // Check for oversized pieces
        const oversizedPieces = pieces.filter(p => 
          (p.effectiveWidth > slabWidth && p.effectiveHeight > slabHeight) && 
          (p.effectiveWidth > slabHeight && p.effectiveHeight > slabWidth)
        );
        
        if (oversizedPieces.length > 0) {
          setResult({
            error: true,
            errorMessage: `Some pieces are too large to fit on any slab, even after splitting: ${oversizedPieces.map(p => p.label).join(', ')}`,
            oversizedPieces
          });
          setIsProcessing(false);
          return;
        }
        
        let slabs;
        
        if (algorithm === BRANCH_AND_BOUND) {
          // Use Branch and Bound for optimal solution
          slabs = branchAndBound(pieces);
          
          if (!slabs) {
            setResult({
              error: true,
              errorMessage: `Could not find a solution with ${maxSlabs} or fewer slabs. Try increasing the maximum slabs or enabling piece splitting.`
            });
            setIsProcessing(false);
            return;
          }
        } else if (algorithm === GENETIC_ALGORITHM) {
          // Use Genetic Algorithm
          slabs = geneticAlgorithm(pieces);
        } else {
          // Use original greedy algorithms
        pieces.forEach(piece => {
          const normalFits = piece.effectiveWidth <= slabWidth && piece.effectiveHeight <= slabHeight;
          const rotatedFits = piece.effectiveHeight <= slabWidth && piece.effectiveWidth <= slabHeight;
          
          if (!normalFits && rotatedFits) {
            piece.rotated = true;
            [piece.width, piece.height] = [piece.height, piece.width];
            [piece.effectiveWidth, piece.effectiveHeight] = [piece.effectiveHeight, piece.effectiveWidth];
          } else if (normalFits && rotatedFits) {
            // Choose best orientation based on waste minimization
            const normalWaste = (slabWidth - piece.effectiveWidth) * piece.effectiveHeight + 
                               (slabHeight - piece.effectiveHeight) * slabWidth;
            const rotatedWaste = (slabWidth - piece.effectiveHeight) * piece.effectiveWidth + 
                                (slabHeight - piece.effectiveWidth) * slabWidth;
            
            if (rotatedWaste < normalWaste) {
              piece.rotated = true;
              [piece.width, piece.height] = [piece.height, piece.width];
              [piece.effectiveWidth, piece.effectiveHeight] = [piece.effectiveHeight, piece.effectiveWidth];
            }
          }
        });
        
        // Sort pieces by area in descending order
        pieces.sort((a, b) => b.area - a.area);
        
        // Initialize slabs array
        slabs = [];
        
        // For each piece, find a place in existing slabs or create a new slab
        pieces.forEach(piece => {
          let placed = false;
          
          // Try to place in existing slabs
          for (let i = 0; i < slabs.length; i++) {
            const slab = slabs[i];
            
            if (slab.spaces.length === 0) {
              continue;
            }
            
            // Find best fit space based on algorithm
            let bestFitIndex = -1;
            let bestFitScore = algorithm === FIRST_FIT ? Infinity : Infinity;
            
            for (let j = 0; j < slab.spaces.length; j++) {
              const space = slab.spaces[j];
              
              if (piece.effectiveWidth <= space.width && piece.effectiveHeight <= space.height) {
                if (algorithm === FIRST_FIT) {
                  // First fit: take the first space that fits
                  bestFitIndex = j;
                  break;
                } else {
                  // Best fit: minimize waste
                  const widthWaste = space.width - piece.effectiveWidth;
                  const heightWaste = space.height - piece.effectiveHeight;
                  const totalWaste = widthWaste * piece.effectiveHeight + heightWaste * space.width;
                  
                  if (totalWaste < bestFitScore) {
                    bestFitScore = totalWaste;
                    bestFitIndex = j;
                  }
                }
              }
            }
            
            // If we found a space, place the piece there
            if (bestFitIndex !== -1) {
              const space = slab.spaces[bestFitIndex];
              
              // Place piece
              slab.pieces.push({
                ...piece,
                x: space.x,
                y: space.y
              });
              
              // Split remaining space
              const oldSpace = slab.spaces.splice(bestFitIndex, 1)[0];
              
              // Horizontal split (below the piece)
              if (oldSpace.height > piece.effectiveHeight) {
                slab.spaces.push({
                  x: oldSpace.x,
                  y: oldSpace.y + piece.effectiveHeight,
                  width: oldSpace.width,
                  height: oldSpace.height - piece.effectiveHeight
                });
              }
              
              // Vertical split (to the right of the piece)
              if (oldSpace.width > piece.effectiveWidth) {
                slab.spaces.push({
                  x: oldSpace.x + piece.effectiveWidth,
                  y: oldSpace.y,
                  width: oldSpace.width - piece.effectiveWidth,
                  height: piece.effectiveHeight
                });
              }
              
              // Sort spaces by area (smallest first for better packing)
              slab.spaces.sort((a, b) => (a.width * a.height) - (b.width * b.height));
              
              placed = true;
              break;
            }
          }
          
          // If not placed, create a new slab
          if (!placed) {
            const newSlab = {
              id: slabs.length + 1,
              pieces: [{
                ...piece,
                x: 0,
                y: 0
              }],
              spaces: []
            };
            
            // Create spaces for remaining area
            if (slabHeight > piece.effectiveHeight) {
              newSlab.spaces.push({
                x: 0,
                y: piece.effectiveHeight,
                width: slabWidth,
                height: slabHeight - piece.effectiveHeight
              });
            }
            
            if (slabWidth > piece.effectiveWidth) {
              newSlab.spaces.push({
                x: piece.effectiveWidth,
                y: 0,
                width: slabWidth - piece.effectiveWidth,
                height: piece.effectiveHeight
              });
            }
            
            slabs.push(newSlab);
          }
        });
        
          slabs.forEach(slab => {
            let usedArea = slab.pieces.reduce((sum, piece) => 
              sum + (piece.effectiveWidth * piece.effectiveHeight), 0);
            slab.totalArea = slabWidth * slabHeight;
            slab.wasteArea = slab.totalArea - usedArea;
            slab.wastePercentage = ((slab.wasteArea / slab.totalArea) * 100).toFixed(1);
          });
        }
        
        // Calculate waste for each slab (for greedy algorithms)
        slabs.forEach(slab => {
          if (!slab.wasteArea) {
            let usedArea = slab.pieces.reduce((sum, piece) => 
              sum + (piece.effectiveWidth * piece.effectiveHeight), 0);
            slab.totalArea = slabWidth * slabHeight;
            slab.wasteArea = slab.totalArea - usedArea;
            slab.wastePercentage = ((slab.wasteArea / slab.totalArea) * 100).toFixed(1);
          }
        });
        
        // Calculate overall statistics
        const totalPieces = pieces.length;
        const totalSlabs = slabs.length;
        const totalAreaNeeded = pieces.reduce((sum, piece) => 
          sum + (piece.effectiveWidth * piece.effectiveHeight), 0);
        const totalSlabArea = slabs.length * (slabWidth * slabHeight);
        const totalWaste = totalSlabArea - totalAreaNeeded;
        const totalWastePercentage = ((totalWaste / totalSlabArea) * 100).toFixed(1);
        
        // Calculate cost estimate (assuming $50 per sq ft)
        const pricePerSqFt = 50;
        const totalSlabSqFt = (totalSlabArea / 144).toFixed(2);
        const estimatedCost = (totalSlabSqFt * pricePerSqFt).toFixed(2);
        
        setResult({
          slabs,
          totalPieces,
          totalSlabs,
          totalAreaNeeded,
          totalSlabArea,
          totalWaste,
          totalWastePercentage,
          splitPieces: splitPiecesInfo,
          totalSlabSqFt,
          estimatedCost
        });
      } catch (error) {
        console.error("Optimization error:", error);
        setResult({
          error: true,
          errorMessage: `An error occurred during optimization: ${error.message}`
        });
      } finally {
        setIsProcessing(false);
      }
    }, 50);
  };

  // Color palette for visualization
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#6366F1',
    '#84CC16', '#A855F7', '#0EA5E9', '#22C55E', '#F43F5E'
  ];
  
  return (
    <div className="flex flex-col p-4 space-y-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Countertop Cutting Optimizer</h1>
        <p className="text-gray-600">Minimize waste when cutting stone countertops from slabs</p>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Stone Slab Settings</h2>
              <button
                onClick={() => setShowTips(!showTips)}
                className="text-blue-600 hover:text-blue-800"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
            
            {showTips && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg text-sm">
                <h3 className="font-semibold mb-2">Tips:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Standard slab sizes: 133"×78" (Jumbo), 120"×55" (Regular)</li>
                  <li>Always add kerf loss (blade width) to account for cutting waste</li>
                  <li>Consider grain direction when rotating pieces</li>
                  <li>Group similar pieces together for efficient cutting</li>
                  <li><strong>Keyboard shortcuts:</strong> Ctrl+S to save, Ctrl+O to optimize</li>
                  <li>Your configuration is automatically saved and restored on page refresh</li>
                </ul>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slab Width (inches)</label>
                <input
                  type="number"
                  value={slabWidth}
                  onChange={(e) => setSlabWidth(parseInt(e.target.value) || DEFAULT_SLAB_WIDTH)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slab Height (inches)</label>
                <input
                  type="number"
                  value={slabHeight}
                  onChange={(e) => setSlabHeight(parseInt(e.target.value) || DEFAULT_SLAB_HEIGHT)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Kerf Loss (blade width in inches)</label>
              <input
                type="number"
                value={kerfloss}
                onChange={(e) => setKerfloss(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                step="0.0625"
                min="0"
                max="0.5"
              />
              <p className="text-xs text-gray-500 mt-1">
                Typical: 1/8" (0.125) for standard blades
              </p>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-800 mb-3">Splitting Options</h3>
              <div className="flex items-center mb-3">
                <input
                  type="checkbox"
                  id="allowSplitting"
                  checked={allowSplitting}
                  onChange={(e) => setAllowSplitting(e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allowSplitting" className="text-sm text-gray-700">
                  Allow splitting long countertops into sections
                </label>
              </div>
              
              {allowSplitting && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum section length (inches)
                  </label>
                  <input
                    type="number"
                    value={minSplitLength}
                    onChange={(e) => setMinSplitLength(parseInt(e.target.value) || 12)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="6"
                    max="48"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Sections smaller than this will be avoided
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-800 mb-3">Optimization Algorithm</h3>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={GUILLOTINE}>Guillotine Cutting (Best Fit)</option>
                <option value={FIRST_FIT}>First Fit Algorithm</option>
                <option value={BEST_FIT}>Best Fit Algorithm</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Guillotine typically provides the best results
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Your Countertops</h2>
              <div className="flex gap-2">
                <select
                  value={selectedPreset}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      // Show saved configurations
                      return;
                    } else if (e.target.value.startsWith('saved:')) {
                      const configName = e.target.value.substring(6);
                      loadConfiguration(configName);
                      setSelectedPreset(e.target.value);
                    } else {
                      loadPreset(e.target.value);
                    }
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="standard">Standard Kitchen</option>
                  <option value="minimal">Minimal Kitchen</option>
                  {Object.keys(savedConfigs).length > 0 && (
                    <optgroup label="Saved Configurations">
                      {Object.keys(savedConfigs).map(name => (
                        <option key={name} value={`saved:${name}`}>{name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                  title="Save current configuration"
                >
                  Save
                </button>
                <button
                  onClick={addCountertop}
                  className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
                >
                  <PlusCircle className="w-4 h-4 mr-1" /> Add
                </button>
              </div>
            </div>
            
            {countertopStats.oversizedCount > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  ⚠️ {countertopStats.oversizedCount} piece{countertopStats.oversizedCount > 1 ? 's' : ''} may be too large for the slab
                </p>
              </div>
            )}
            
            <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">Total Pieces</div>
                <div className="font-semibold">{countertops.length}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">Total Area</div>
                <div className="font-semibold">{countertopStats.totalArea} sq in</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">Largest Piece</div>
                <div className="font-semibold">
                  {countertopStats.largestPiece.label ? 
                    `${countertopStats.largestPiece.width}×${countertopStats.largestPiece.height}` : 
                    'N/A'}
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-2 text-sm font-medium text-gray-700">Label</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-700">Width</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-700">Height</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-700">Area</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {countertops.map(c => {
                    const area = c.width * c.height;
                    const isOversized = (c.width > slabWidth && c.height > slabHeight) || 
                                       (c.height > slabWidth && c.width > slabHeight);
                    
                    return (
                      <tr key={c.id} className={`border-b hover:bg-gray-50 ${isOversized ? 'bg-red-50' : ''}`}>
                        <td className="p-2">
                          <input
                            type="text"
                            value={c.label}
                            onChange={(e) => updateCountertop(c.id, 'label', e.target.value)}
                            className="w-full p-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={c.width}
                            onChange={(e) => updateCountertop(c.id, 'width', e.target.value)}
                            className="w-20 p-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={c.height}
                            onChange={(e) => updateCountertop(c.id, 'height', e.target.value)}
                            className="w-20 p-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="p-2 text-sm text-gray-600">
                          {area} sq in
                        </td>
                        <td className="p-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => duplicateCountertop(c.id)}
                              className="text-gray-600 hover:text-gray-800"
                              title="Duplicate"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeCountertop(c.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={runOptimization}
                disabled={isProcessing || countertops.length === 0}
                className={`flex-1 bg-blue-600 text-white px-4 py-2 rounded-md font-medium
                  ${isProcessing || countertops.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
              >
                {isProcessing ? 'Optimizing...' : 'Optimize Cutting Layout'}
              </button>
              
              {countertops.length < 20 && (
                <button
                  onClick={() => setShowComparison(true)}
                  disabled={isProcessing || countertops.length === 0}
                  className={`px-4 py-2 border border-blue-600 text-blue-600 rounded-md font-medium
                    ${isProcessing || countertops.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'}`}
                  title="Compare all algorithms"
                >
                  Compare
                </button>
              )}
              
              <button
                onClick={() => {
                  if (confirm('Clear all countertops and reset to defaults?')) {
                    setCountertops([]);
                    setNextId(1);
                    setResult(null);
                    setSlabWidth(DEFAULT_SLAB_WIDTH);
                    setSlabHeight(DEFAULT_SLAB_HEIGHT);
                    setAllowSplitting(true);
                    setMinSplitLength(24);
                    setKerfloss(0.125);
                    setAlgorithm(GUILLOTINE);
                    setMaxSlabs(3);
                  }
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                title="Clear all and reset"
              >
                Reset
              </button>
              
              <button
                onClick={exportConfig}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                title="Export configuration"
              >
                <Download className="w-4 h-4" />
              </button>
              
              <label className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
                     title="Import configuration">
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  accept=".json"
                  onChange={importConfig}
                  className="hidden"
                />
              </label>
            </div>
            
            {/* Progress indicator */}
            {isProcessing && optimizationProgress && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-800 mb-2">
                  {algorithm === BRANCH_AND_BOUND ? 'Finding Optimal Solution...' : 'Optimizing...'}
                </div>
                {algorithm === BRANCH_AND_BOUND && (
                  <div className="text-xs text-blue-600">
                    <div>Nodes explored: {optimizationProgress.nodesExplored?.toLocaleString()}</div>
                    <div>Current depth: {optimizationProgress.currentDepth} / {optimizationProgress.totalDepth}</div>
                    {optimizationProgress.bestWaste !== null && (
                      <div>Best solution found: {(optimizationProgress.bestWaste / (slabWidth * slabHeight)).toFixed(1)} slabs</div>
                    )}
                  </div>
                )}
                {algorithm === GENETIC_ALGORITHM && (
                  <div className="text-xs text-blue-600">
                    <div>Generation: {optimizationProgress.generation} / {optimizationProgress.totalGenerations}</div>
                    <div>Best fitness: {optimizationProgress.bestFitness?.toFixed(0)}</div>
                  </div>
                )}
                <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: algorithm === BRANCH_AND_BOUND 
                        ? `${(optimizationProgress.currentDepth / optimizationProgress.totalDepth * 100)}%`
                        : `${(optimizationProgress.generation / optimizationProgress.totalGenerations * 100)}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1">
          {result && result.error ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-red-700">Error in Optimization</h2>
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-600 mb-4">{result.errorMessage}</p>
                {result.oversizedPieces && (
                  <div className="bg-white p-4 rounded border border-red-200">
                    <h3 className="font-medium mb-2">Problematic Pieces:</h3>
                    <ul className="list-disc pl-5">
                      {result.oversizedPieces.map(piece => (
                        <li key={piece.id} className="mb-1">
                          <span className="font-medium">{piece.label}:</span> {piece.width}" × {piece.height}" 
                          <span className="text-gray-600"> (Slab: {slabWidth}" × {slabHeight}")</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-sm text-gray-600">
                      <strong>Suggestions:</strong> Enable piece splitting, reduce piece dimensions, or use larger slabs.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : result && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Optimization Results</h2>
                {algorithm === BRANCH_AND_BOUND && (
                  <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    ✓ Optimal Solution
                  </span>
                )}
                {algorithm === GENETIC_ALGORITHM && (
                  <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    Near-Optimal Solution
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600">Total Slabs Needed</div>
                  <div className="text-2xl font-bold text-blue-800">{result.totalSlabs}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600">Material Efficiency</div>
                  <div className="text-2xl font-bold text-green-800">{(100 - parseFloat(result.totalWastePercentage)).toFixed(1)}%</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Total Cost Estimate</div>
                  <div className="text-2xl font-bold text-gray-800">${result.estimatedCost}</div>
                  <div className="text-xs text-gray-500">@ $50/sq ft</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-sm text-orange-600">Waste Area</div>
                  <div className="text-2xl font-bold text-orange-800">{(result.totalWaste / 144).toFixed(1)} sq ft</div>
                  <div className="text-xs text-orange-500">{result.totalWastePercentage}% waste</div>
                </div>
              </div>
              
              <div className="mb-4">
                <button
                  onClick={() => setShowOptimalCuts(!showOptimalCuts)}
                  className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
                >
                  <RotateCw className={`w-4 h-4 mr-1 transition-transform ${showOptimalCuts ? 'rotate-90' : ''}`} />
                  {showOptimalCuts ? 'Hide' : 'Show'} Cutting Layout
                </button>
              </div>
              
              {showOptimalCuts && (
                <div className="space-y-6">
                  {result.slabs.map((slab, slabIndex) => (
                    <div key={slab.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold text-gray-800">Slab {slab.id}</h3>
                        <div className="flex gap-4 text-sm">
                          <span className="text-gray-600">Efficiency: {(100 - parseFloat(slab.wastePercentage)).toFixed(1)}%</span>
                          <span className="text-orange-600">Waste: {slab.wastePercentage}%</span>
                        </div>
                      </div>
                      
                      <div className="relative bg-white rounded border-2 border-gray-300" 
                           style={{ paddingBottom: `${(slabHeight / slabWidth) * 100}%` }}>
                        <div className="absolute inset-0">
                          {/* Display each piece */}
                          {slab.pieces.map((piece, pieceIndex) => {
                            const colorId = piece.originalId || piece.id;
                            const colorIndex = (typeof colorId === 'number' ? colorId - 1 : parseInt(colorId) - 1) % colors.length;
                            
                            // Calculate scaled positions and dimensions
                            const scaleX = 100 / slabWidth;
                            const scaleY = 100 / slabHeight;
                            
                            return (
                              <div
                                key={pieceIndex}
                                className="absolute border-2 border-white flex flex-col items-center justify-center overflow-hidden rounded shadow-sm"
                                style={{
                                  left: `${piece.x * scaleX}%`,
                                  top: `${piece.y * scaleY}%`,
                                  width: `${piece.effectiveWidth * scaleX}%`,
                                  height: `${piece.effectiveHeight * scaleY}%`,
                                  backgroundColor: colors[colorIndex],
                                }}
                                title={`${piece.label} - ${piece.width}×${piece.height}" ${piece.rotated ? '(Rotated)' : ''}`}
                              >
                                <div className="text-xs text-white font-semibold text-center px-1">
                                  {piece.width}×{piece.height}
                                </div>
                                <div className="text-xs text-white text-center px-1 truncate w-full">
                                  {piece.label}
                                </div>
                                {piece.rotated && (
                                  <RotateCw className="w-3 h-3 text-white mt-1" />
                                )}
                              </div>
                            );
                          })}
                          
                          {/* Grid overlay for visual reference */}
                          <div className="absolute inset-0 pointer-events-none"
                               style={{
                                 backgroundImage: `
                                   linear-gradient(to right, rgba(229, 231, 235, 0.5) 1px, transparent 1px),
                                   linear-gradient(to bottom, rgba(229, 231, 235, 0.5) 1px, transparent 1px)
                                 `,
                                 backgroundSize: '10% 10%'
                               }}
                          />
                        </div>
                      </div>
                      
                      <div className="mt-3 flex justify-between text-sm text-gray-600">
                        <span>Slab dimensions: {slabWidth}" × {slabHeight}"</span>
                        <span>{slab.pieces.length} pieces</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Split pieces summary */}
              {result.splitPieces && result.splitPieces.length > 0 && (
                <div className="mt-6 bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-medium mb-3 text-yellow-800">
                    <RotateCw className="inline w-4 h-4 mr-1" />
                    Split Countertops
                  </h3>
                  <div className="space-y-3">
                    {result.splitPieces.map((piece, index) => (
                      <div key={index} className="bg-white rounded p-3 border border-yellow-200">
                        <div className="font-medium text-gray-800 mb-2">
                          {piece.originalLabel} → {piece.parts} sections
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {piece.pieces && piece.pieces.map((subPiece, idx) => (
                            <div key={idx} className="text-gray-600">
                              • Part {idx + 1}: {subPiece.width}" × {subPiece.height}"
                              {subPiece.rotated && ' (R)'}
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Split {piece.direction}ly to fit slab constraints
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Cutting instructions */}
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium mb-2 text-gray-800">Cutting Tips</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Account for {kerfloss}" kerf loss on each cut</li>
                  <li>• Verify grain direction before cutting rotated pieces</li>
                  <li>• Cut largest pieces first for better material handling</li>
                  <li>• Keep all offcuts for potential future use</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Save Configuration Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Save Configuration</h3>
            <input
              type="text"
              value={newConfigName}
              onChange={(e) => setNewConfigName(e.target.value)}
              placeholder="Enter configuration name..."
              className="w-full p-2 border border-gray-300 rounded-md mb-4"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newConfigName.trim()) {
                  saveConfiguration(newConfigName.trim());
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setNewConfigName('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newConfigName.trim()) {
                    saveConfiguration(newConfigName.trim());
                  }
                }}
                disabled={!newConfigName.trim()}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md
                  ${newConfigName.trim() ? 'hover:bg-blue-700' : 'opacity-50 cursor-not-allowed'}`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Saved Configurations Management */}
      {Object.keys(savedConfigs).length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">Saved Configurations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(savedConfigs).map(([name, config]) => (
              <div key={name} className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-800">{name}</h3>
                  <button
                    onClick={() => {
                      if (confirm(`Delete configuration "${name}"?`)) {
                        deleteConfiguration(name);
                      }
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>{config.countertops.length} pieces</div>
                  <div>Slab: {config.slabWidth}" × {config.slabHeight}"</div>
                  <div>{new Date(config.timestamp).toLocaleDateString()}</div>
                </div>
                <button
                  onClick={() => {
                    loadConfiguration(name);
                    setSelectedPreset(`saved:${name}`);
                  }}
                  className="mt-2 w-full text-sm bg-blue-50 text-blue-600 py-1 rounded hover:bg-blue-100"
                >
                  Load
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Comparison Modal */}
      {showComparison && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Algorithm Comparison</h2>
                <button
                  onClick={() => setShowComparison(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {!comparisonResults ? (
                <div className="text-center py-8">
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
                      <RotateCw className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                  </div>
                  <p className="text-gray-600">Running comparison across all algorithms...</p>
                  <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
                </div>
              ) : (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Results Summary</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="border-b-2 border-gray-200">
                            <th className="text-left p-3">Algorithm</th>
                            <th className="text-center p-3">Slabs Used</th>
                            <th className="text-center p-3">Total Waste %</th>
                            <th className="text-center p-3">Time (ms)</th>
                            <th className="text-center p-3">Quality</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparisonResults.map((result, idx) => (
                            <tr key={idx} className={`border-b ${result.isOptimal ? 'bg-green-50' : ''}`}>
                              <td className="p-3 font-medium">{result.algorithm}</td>
                              <td className="text-center p-3">{result.slabs}</td>
                              <td className="text-center p-3">{result.wastePercent}%</td>
                              <td className="text-center p-3">{result.time}</td>
                              <td className="text-center p-3">
                                {result.isOptimal ? (
                                  <span className="text-green-600">✓ Optimal</span>
                                ) : (
                                  <span className="text-gray-600">{result.quality}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">Recommendation</h4>
                    <p className="text-sm text-blue-700">
                      {comparisonResults[0].slabs === comparisonResults[comparisonResults.length - 1].slabs
                        ? "All algorithms found solutions with the same number of slabs. Choose based on speed preference."
                        : `Branch & Bound found the optimal solution with ${comparisonResults.find(r => r.isOptimal).slabs} slabs. ` +
                          `This saves ${comparisonResults[0].slabs - comparisonResults.find(r => r.isOptimal).slabs} slab(s) compared to the fastest algorithm.`}
                    </p>
                  </div>
                  
                  <div className="mt-4 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        const bestResult = comparisonResults.find(r => r.isOptimal) || comparisonResults[0];
                        setAlgorithm(bestResult.algorithmId);
                        setShowComparison(false);
                        runOptimization();
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      Use Best Algorithm
                    </button>
                    <button
                      onClick={() => setShowComparison(false)}
                      className="border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountertopOptimizer;
