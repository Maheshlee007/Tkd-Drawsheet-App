import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PlayIcon, PauseIcon, SkipBackIcon, SkipForwardIcon, RefreshCwIcon } from "lucide-react";

interface AnimationControlsProps {
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  totalSteps: number;
  resetAnimation: () => void;
  animationSpeed: number;
  setAnimationSpeed: (speed: number) => void;
}

const AnimationControls = ({
  isPlaying,
  setIsPlaying,
  currentStep,
  setCurrentStep,
  totalSteps,
  resetAnimation,
  animationSpeed,
  setAnimationSpeed,
}: AnimationControlsProps) => {
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const stepForward = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const stepBackward = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSliderChange = (newValue: number[]) => {
    setCurrentStep(newValue[0]);
  };

  const handleSpeedChange = (newValue: number[]) => {
    setAnimationSpeed(newValue[0]);
  };

  return (
    <div className="mt-4 space-y-4 p-4 border rounded-lg bg-card shadow-sm">
      <div className="text-lg font-semibold mb-2">Tournament Animation</div>
      
      <div className="flex items-center justify-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={resetAnimation}
          title="Reset Animation"
        >
          <RefreshCwIcon className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={stepBackward}
          disabled={currentStep <= 0}
          title="Previous Step"
        >
          <SkipBackIcon className="h-4 w-4" />
        </Button>
        
        <Button
          variant="default"
          size="icon"
          onClick={togglePlay}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <PauseIcon className="h-4 w-4" />
          ) : (
            <PlayIcon className="h-4 w-4" />
          )}
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={stepForward}
          disabled={currentStep >= totalSteps}
          title="Next Step"
        >
          <SkipForwardIcon className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm">Progress: Step {currentStep} of {totalSteps}</span>
          <span className="text-sm">{Math.round((currentStep / totalSteps) * 100)}%</span>
        </div>
        <Slider
          value={[currentStep]}
          min={0}
          max={totalSteps}
          step={1}
          onValueChange={handleSliderChange}
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm">Animation Speed</span>
          <span className="text-sm">{animationSpeed}x</span>
        </div>
        <Slider
          value={[animationSpeed]}
          min={0.5}
          max={3}
          step={0.5}
          onValueChange={handleSpeedChange}
        />
      </div>
    </div>
  );
};

export default AnimationControls;