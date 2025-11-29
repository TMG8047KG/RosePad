import React, { JSX } from 'react';

// Props interface for FlowerNumber component
interface FlowerNumberProps {
  number: number;
  seed?: number;
}

// Position interface for flower positioning
interface FlowerPosition {
  x: number;
  y: number;
  seedOffset: number;
}

// Reusable FlowerNumber component
export const FlowerNumber: React.FC<FlowerNumberProps> = ({ number, seed = 1 }) => {
  // Seeded random number generator for consistent randomness
  const seededRandom = (seed: number): number => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // Generate a simple flower with irregular overlapping petals (scaled for 50x50px)
  const generateFlower = (x: number, y: number, seedOffset: number): JSX.Element => {
    const petals: JSX.Element[] = [];
    const petalCount = 5 + Math.floor(seededRandom(seed + seedOffset) * 2);
    
    // Draw irregular rounded petals from center
    for (let i = 0; i < petalCount; i++) {
      const angle = (i * 2 * Math.PI) / petalCount + seededRandom(seed + seedOffset + i * 10) * 0.15; // Less angle variation for symmetry
      
      const petalLength = 5.5 + seededRandom(seed + seedOffset + i * 30) * 1.5; // Less length variation
      const petalWidth = 4.5 + seededRandom(seed + seedOffset + i * 20) * 1; // Less width variation
      
      const tipX = x + Math.cos(angle) * petalLength;
      const tipY = y + Math.sin(angle) * petalLength;
      
      // Create rounder petal with wider control points
      const controlDist = petalLength * 0.8;
      const side1X = x + Math.cos(angle - 0.7) * petalWidth;
      const side1Y = y + Math.sin(angle - 0.7) * petalWidth;
      const side2X = x + Math.cos(angle + 0.7) * petalWidth;
      const side2Y = y + Math.sin(angle + 0.7) * petalWidth;
      
      const control1X = x + Math.cos(angle - 0.4) * controlDist;
      const control1Y = y + Math.sin(angle - 0.4) * controlDist;
      const control2X = x + Math.cos(angle + 0.4) * controlDist;
      const control2Y = y + Math.sin(angle + 0.4) * controlDist;
      
      const wobble = seededRandom(seed + seedOffset + i * 50) * 0.5 - 0.25; // Less wobble
      
      // Use cubic bezier for very round petals
      const path = `
        M ${x} ${y}
        C ${side1X} ${side1Y} ${control1X + wobble} ${control1Y} ${tipX} ${tipY}
        C ${control2X - wobble} ${control2Y} ${side2X} ${side2Y} ${x} ${y}
      `;
      
      petals.push(
        <path
          key={`petal-${i}`}
          d={path}
          fill="currentColor"
          stroke="black"
          strokeWidth="0.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      );
    }
    
    petals.push(
      <circle
        key="center"
        cx={x}
        cy={y}
        r={1.8}
        fill="yellow"
        stroke="black"
        strokeWidth="0.5"
      />
    );
    
    return <>{petals}</>;
  };

  // Generate curved, wiggly stem
  const generateStem = (x: number, y: number, seedOffset: number): JSX.Element => {
    const stemHeight = 12 + seededRandom(seed + seedOffset + 100) * 8;
    
    // More wobble with multiple curves
    const curve1 = (seededRandom(seed + seedOffset + 200) - 0.5) * 10;
    const curve2 = (seededRandom(seed + seedOffset + 300) - 0.5) * 8;
    const curve3 = (seededRandom(seed + seedOffset + 400) - 0.5) * 6;
    
    const endX = x + curve3;
    const endY = y + stemHeight;
    
    // Add more control points for wobblier path
    const control1X = x + curve1;
    const control1Y = y + stemHeight * 0.25;
    const control2X = x - curve2;
    const control2Y = y + stemHeight * 0.6;
    const control3X = x + curve3 * 0.2;
    const control3Y = y + stemHeight * 0.75;
    
    // Use multiple cubic bezier segments for more wobble
    return (
      <path
        d={`M ${x} ${y} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${control3X} ${control3Y} S ${endX - curve3 * 0.3} ${endY - 2}, ${endX} ${endY}`}
        stroke="green"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
    );
  };

  // Generate flower positions in a clustered bunch
  const generateFlowerPositions = (): FlowerPosition[] => {
    const positions: FlowerPosition[] = [];
    const centerX = 25; // Center of 50px canvas
    const centerY = 25; // Center of 50px canvas
    
    for (let i = 0; i < number; i++) {
      const angle = seededRandom(seed + i * 300) * Math.PI * 2;
      const distance = seededRandom(seed + i * 400) * 12;
      
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance * 0.6;
      
      positions.push({
        x: x,
        y: y,
        seedOffset: i * 1000
      });
    }
    
    return positions;
  };

  const positions = generateFlowerPositions();

  return (
    <svg width="50" height="50" viewBox="0 0 50 50" className="max-w-full h-auto">
      {positions.map((pos, i) => (
        <g key={i}>
          {generateStem(pos.x, pos.y, pos.seedOffset)}
          {generateFlower(pos.x, pos.y, pos.seedOffset)}
        </g>
      ))}
    </svg>
  );
};
