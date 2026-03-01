"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useSolverStore } from "@/lib/stores/solver-store";

const BET_SIZE_OPTIONS = [0.25, 0.33, 0.5, 0.67, 0.75, 1.0, 1.5, 2.0];

export function NlheConfigForm() {
  const board = useSolverStore((s) => s.board);
  const setBoard = useSolverStore((s) => s.setBoard);
  const rangeP0 = useSolverStore((s) => s.rangeP0);
  const setRangeP0 = useSolverStore((s) => s.setRangeP0);
  const rangeP1 = useSolverStore((s) => s.rangeP1);
  const setRangeP1 = useSolverStore((s) => s.setRangeP1);
  const pot = useSolverStore((s) => s.pot);
  const setPot = useSolverStore((s) => s.setPot);
  const stack = useSolverStore((s) => s.stack);
  const setStack = useSolverStore((s) => s.setStack);
  const betSizes = useSolverStore((s) => s.betSizes);
  const setBetSizes = useSolverStore((s) => s.setBetSizes);

  const toggleBetSize = (size: number) => {
    if (betSizes.includes(size)) {
      setBetSizes(betSizes.filter((s) => s !== size));
    } else {
      setBetSizes([...betSizes, size].sort((a, b) => a - b));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="board" className="text-xs">Board</Label>
        <Input
          id="board"
          value={board}
          onChange={(e) => setBoard(e.target.value)}
          placeholder="Qs9d2c"
          className="mt-1 font-mono text-xs"
        />
      </div>

      <div>
        <Label htmlFor="range-p0" className="text-xs">OOP Range (P0)</Label>
        <Textarea
          id="range-p0"
          value={rangeP0}
          onChange={(e) => setRangeP0(e.target.value)}
          placeholder="AA,KK,QQ,AKs..."
          className="mt-1 h-16 resize-none font-mono text-xs"
        />
      </div>

      <div>
        <Label htmlFor="range-p1" className="text-xs">IP Range (P1)</Label>
        <Textarea
          id="range-p1"
          value={rangeP1}
          onChange={(e) => setRangeP1(e.target.value)}
          placeholder="AA,KK,QQ,AKs..."
          className="mt-1 h-16 resize-none font-mono text-xs"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="pot" className="text-xs">Pot</Label>
          <Input
            id="pot"
            type="number"
            value={pot}
            onChange={(e) => setPot(Number(e.target.value))}
            className="mt-1 font-mono text-xs"
          />
        </div>
        <div>
          <Label htmlFor="stack" className="text-xs">Stack</Label>
          <Input
            id="stack"
            type="number"
            value={stack}
            onChange={(e) => setStack(Number(e.target.value))}
            className="mt-1 font-mono text-xs"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Bet Sizes (% pot)</Label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {BET_SIZE_OPTIONS.map((size) => (
            <Badge
              key={size}
              variant={betSizes.includes(size) ? "default" : "outline"}
              className="cursor-pointer select-none text-xs tabular-nums"
              onClick={() => toggleBetSize(size)}
            >
              {Math.round(size * 100)}%
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
