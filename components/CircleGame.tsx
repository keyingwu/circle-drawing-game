"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";

const CircleGame = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const centerRef = useRef<[number, number] | null>(null);
  const [showGuide, setShowGuide] = useState(true);
  const guideCircleRef = useRef<{ x: number; y: number; radius: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 3;

    // Clear canvas first
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw initial guide circle
    drawGuideCircle();

    // If we're in the middle of drawing, redraw the user's progress
    if (points.length > 0) {
      points.forEach((point, i) => {
        if (i === 0) return;
        const prevPoint = points[i - 1];
        ctx.beginPath();
        ctx.strokeStyle = getColorFromScore(calculateCircularity(points.slice(0, i), point));
        ctx.lineWidth = 3;
        ctx.moveTo(prevPoint[0], prevPoint[1]);
        ctx.lineTo(point[0], point[1]);
        ctx.stroke();
      });
    }
  }, [showGuide]); // Add showGuide as dependency

  const drawGuideCircle = () => {
    const canvas = canvasRef.current;
    if (!canvas || !showGuide) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Create guide circle in the center
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 4;

    guideCircleRef.current = { x: centerX, y: centerY, radius };

    if (showGuide) {
      // Only draw if guide should be shown
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  const calculateCircularity = (points: [number, number][], newPoint: [number, number]): number => {
    if (points.length < 3) return 1;

    if (!centerRef.current && points.length > 5) {
      const sumX = points.reduce((sum, p) => sum + p[0], 0);
      const sumY = points.reduce((sum, p) => sum + p[1], 0);
      centerRef.current = [sumX / points.length, sumY / points.length];
    }

    if (!centerRef.current) return 1;

    const [centerX, centerY] = centerRef.current;
    const radii = [...points, newPoint].map((p) => Math.sqrt(Math.pow(p[0] - centerX, 2) + Math.pow(p[1] - centerY, 2)));

    const avgRadius = radii.reduce((sum, r) => sum + r, 0) / radii.length;
    const variance = radii.reduce((sum, r) => sum + Math.pow(r - avgRadius, 2), 0) / radii.length;

    const maxVariance = 2000;
    return Math.max(0, Math.min(1, 1 - variance / maxVariance));
  };

  const getColorFromScore = (score: number): string => {
    // For drawing: convert score (0-1) to percentage (0-100)
    const scorePercentage = score * 100;

    if (scorePercentage >= 90) return "rgb(74, 222, 128)"; // green-400
    if (scorePercentage >= 70) return "rgb(250, 204, 21)"; // yellow-400
    return "rgb(239, 68, 68)"; // red-400
  };

  const getInputPos = (e: React.MouseEvent | React.TouchEvent | Touch): [number, number] => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0];

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    return [clientX - rect.left, clientY - rect.top];
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling on touch devices

    const canvas = canvasRef.current;
    if (!canvas) return;

    const [x, y] = getInputPos("touches" in e ? e.touches[0] : e);

    setIsDrawing(true);
    setPoints([[x, y]]);
    setScore(null);
    centerRef.current = null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGuideCircle();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling on touch devices

    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const [x, y] = getInputPos("touches" in e ? e.touches[0] : e);
    const newPoint: [number, number] = [x, y];

    const circularityScore = calculateCircularity(points, newPoint);
    const color = getColorFromScore(circularityScore);

    setPoints((prev) => [...prev, newPoint]);

    // Redraw everything
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGuideCircle();

    // Draw accuracy indicators
    if (guideCircleRef.current && points.length > 5) {
      const guide = guideCircleRef.current;
      const currentRadius = Math.sqrt(Math.pow(x - guide.x, 2) + Math.pow(y - guide.y, 2));
      const radiusDiff = Math.abs(currentRadius - guide.radius);
      const maxAllowedDiff = 20;
      const diffScore = 1 - Math.min(radiusDiff, maxAllowedDiff) / maxAllowedDiff;

      // Draw radius indicator
      ctx.beginPath();
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = getColorFromScore(diffScore);
      ctx.moveTo(guide.x, guide.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw the path with color feedback
    points.forEach((point, i) => {
      if (i === 0) return;

      const prevPoint = points[i - 1];
      const currentCircularity = calculateCircularity(points.slice(0, i), point);
      const segmentColor = getColorFromScore(currentCircularity);

      ctx.beginPath();
      ctx.strokeStyle = segmentColor;
      ctx.moveTo(prevPoint[0], prevPoint[1]);
      ctx.lineTo(point[0], point[1]);
      ctx.stroke();
    });

    // Draw current segment
    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.moveTo(lastPoint[0], lastPoint[1]);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const endDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    setIsDrawing(false);
    calculateScore();
  };

  const calculateScore = () => {
    if (points.length < 20) return; // Need minimum points for calculation

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Calculate center point
    const centerX = points.reduce((sum, p) => sum + p[0], 0) / points.length;
    const centerY = points.reduce((sum, p) => sum + p[1], 0) / points.length;

    // Calculate radii and their statistics
    const radii = points.map((p) => Math.sqrt(Math.pow(p[0] - centerX, 2) + Math.pow(p[1] - centerY, 2)));
    const avgRadius = radii.reduce((sum, r) => sum + r, 0) / radii.length;

    // Calculate normalized variance (0-1 scale)
    const normalizedVariances = radii.map((r) => Math.abs(r - avgRadius) / avgRadius);
    const avgNormalizedVariance = normalizedVariances.reduce((sum, v) => sum + v, 0) / normalizedVariances.length;

    // Base score calculation (more generous scoring)
    let circleScore = 100 * (1 - avgNormalizedVariance * 2);

    // Calculate closure score (how well the circle is closed)
    const startPoint = points[0];
    const endPoint = points[points.length - 1];
    const closureDistance = Math.sqrt(Math.pow(endPoint[0] - startPoint[0], 2) + Math.pow(endPoint[1] - startPoint[1], 2));
    const closureScore = Math.max(0, 1 - closureDistance / avgRadius);

    // Calculate smoothness score
    let smoothnessScore = 0;
    for (let i = 2; i < points.length; i++) {
      const p1 = points[i - 2];
      const p2 = points[i - 1];
      const p3 = points[i];

      // Calculate angles between consecutive segments
      const angle1 = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
      const angle2 = Math.atan2(p3[1] - p2[1], p3[0] - p2[0]);
      let angleDiff = Math.abs(angle2 - angle1);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

      smoothnessScore += 1 - angleDiff / Math.PI;
    }
    smoothnessScore = (smoothnessScore / (points.length - 2)) * 100;

    // Combine scores with weights
    circleScore = Math.round(
      circleScore * 0.6 + // Base circularity: 60%
        closureScore * 20 + // Closure: 20%
        smoothnessScore * 0.2 // Smoothness: 20%
    );

    // Ensure score is within bounds
    circleScore = Math.max(0, Math.min(100, circleScore));

    setScore(circleScore);
    if (!bestScore || circleScore > bestScore) {
      setBestScore(circleScore);
    }

    // Clear canvas for redrawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw guide if enabled
    if (showGuide) {
      drawGuideCircle();
    }

    // Get final score color based on the calculated score
    const finalColor =
      circleScore >= 90
        ? "rgb(74, 222, 128)" // green-400
        : circleScore >= 70
        ? "rgb(250, 204, 21)" // yellow-400
        : "rgb(239, 68, 68)"; // red-400

    // Draw the user's final circle with the final score color
    points.forEach((point, i) => {
      if (i === 0) return;
      const prevPoint = points[i - 1];
      ctx.beginPath();
      ctx.strokeStyle = finalColor; // Use the final color for the whole circle
      ctx.lineWidth = 3;
      ctx.moveTo(prevPoint[0], prevPoint[1]);
      ctx.lineTo(point[0], point[1]);
      ctx.stroke();
    });

    // Add visual feedback with perfect circle overlay
    const overlayColor =
      circleScore >= 90
        ? "rgba(74, 222, 128, 0.3)" // green with opacity
        : circleScore >= 70
        ? "rgba(250, 204, 21, 0.3)" // yellow with opacity
        : "rgba(239, 68, 68, 0.3)"; // red with opacity

    // Draw perfect circle comparison
    ctx.beginPath();
    ctx.strokeStyle = overlayColor;
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.arc(centerX, centerY, avgRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw radius indicators
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.beginPath();
    ctx.moveTo(centerX - 5, centerY);
    ctx.lineTo(centerX + 5, centerY);
    ctx.moveTo(centerX, centerY - 5);
    ctx.lineTo(centerX, centerY + 5);
    ctx.stroke();

    // Optional: Animate completion with the same color as the overlay
    let angle = 0;
    const animateCompletion = () => {
      if (angle <= Math.PI * 2) {
        ctx.beginPath();
        ctx.strokeStyle = overlayColor;
        ctx.setLineDash([5, 5]);
        ctx.arc(centerX, centerY, avgRadius, 0, angle);
        ctx.stroke();
        angle += 0.1;
        requestAnimationFrame(animateCompletion);
      }
    };

    // Start the completion animation
    requestAnimationFrame(animateCompletion);
  };

  return (
    <Card className="p-6 bg-slate-900 w-full max-w-2xl mx-auto">
      <div className="flex flex-col items-center gap-4">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-white mb-2">Draw a Circle</h2>
          {score !== null && (
            <div className="text-xl">
              <span className="text-white">Score: </span>
              <span className={score >= 90 ? "text-green-400" : score >= 70 ? "text-yellow-400" : "text-red-400"}>{score}%</span>
            </div>
          )}
          {bestScore !== null && <div className="text-sm text-green-400">Best: {bestScore}%</div>}
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="border border-gray-700 rounded bg-slate-800 touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={endDrawing}
            onTouchCancel={endDrawing}
          />

          <button
            onClick={() => {
              setShowGuide((prev) => !prev);
              const canvas = canvasRef.current;
              if (!canvas) return;
              const ctx = canvas.getContext("2d");
              if (!ctx) return;

              // Clear and redraw
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              if (!showGuide) {
                drawGuideCircle();
              }

              // Redraw the user's progress if any
              if (points.length > 0) {
                points.forEach((point, i) => {
                  if (i === 0) return;
                  const prevPoint = points[i - 1];
                  ctx.beginPath();
                  ctx.strokeStyle = getColorFromScore(calculateCircularity(points.slice(0, i), point));
                  ctx.lineWidth = 3;
                  ctx.moveTo(prevPoint[0], prevPoint[1]);
                  ctx.lineTo(point[0], point[1]);
                  ctx.stroke();
                });
              }
            }}
            className="absolute top-2 right-2 px-3 py-1 text-sm bg-slate-700 text-white rounded-full opacity-50 hover:opacity-100 transition-opacity"
          >
            {showGuide ? "Hide" : "Show"} Guide
          </button>
        </div>

        <div className="space-y-2 text-center">
          <p className="text-gray-400 text-sm">Draw a circle - follow the dotted guide for better accuracy!</p>
          <p className="text-gray-500 text-xs">Green = Perfect circle, Red = Needs improvement</p>
        </div>
      </div>
    </Card>
  );
};

export default CircleGame;
