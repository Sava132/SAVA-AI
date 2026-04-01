import {
  useRef,
  useEffect,
  useState,
  type FC,
  type MouseEvent,
  type TouchEvent,
  type ChangeEvent,
} from "react";
import {
  Download,
  Trash2,
  Eraser,
  Pen,
  Sliders,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CanvasProps {
  theme: "light" | "dark";
}

export const Canvas: FC<CanvasProps> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState(theme === "dark" ? "#3B82F6" : "#2563EB");
  const [brushSize, setBrushSize] = useState(4);
  const [opacity, setOpacity] = useState(1);
  const [isNeon, setIsNeon] = useState(true);
  const [isRainbow, setIsRainbow] = useState(false);
  const [hue, setHue] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isRainbow) {
      interval = setInterval(() => {
        setHue((prev) => (prev + 5) % 360);
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isRainbow]);

  useEffect(() => {
    if (isRainbow) {
      setColor(`hsl(${hue}, 100%, 50%)`);
    }
  }, [hue, isRainbow]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d");
        if (tempCtx) {
          tempCtx.drawImage(canvas, 0, 0);
        }

        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;

        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.drawImage(
          tempCanvas,
          0,
          0,
          tempCanvas.width,
          tempCanvas.height,
          0,
          0,
          canvas.width,
          canvas.height,
        );
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  useEffect(() => {
    if (tool === "pen") {
      setColor(theme === "dark" ? "#3B82F6" : "#2563EB");
    }
  }, [theme, tool]);

  const startDrawing = (e: MouseEvent | TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (e: MouseEvent | TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = brushSize * 5;
      ctx.shadowBlur = 0;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.globalAlpha = opacity;

      if (isNeon) {
        ctx.shadowBlur = brushSize * 1.5;
        ctx.shadowColor = color;
      } else {
        ctx.shadowBlur = 0;
      }
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "sava-canvas.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-wrap items-center justify-between bg-gray-100 dark:bg-gray-800 p-3 rounded-2xl gap-4">
        <div className="flex items-center gap-3">
          <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setTool("pen")}
              className={cn(
                "p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider",
                tool === "pen"
                  ? "bg-white dark:bg-gray-700 shadow-sm text-brand-blue"
                  : "opacity-60 hover:opacity-100",
              )}
            >
              <Pen className="w-4 h-4" />
              Pen
            </button>
            <button
              onClick={() => setTool("eraser")}
              className={cn(
                "p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider",
                tool === "eraser"
                  ? "bg-white dark:bg-gray-700 shadow-sm text-brand-blue"
                  : "opacity-60 hover:opacity-100",
              )}
            >
              <Eraser className="w-4 h-4" />
              Eraser
            </button>
          </div>

          <div className="h-8 w-px bg-black/10 dark:bg-white/10 mx-1" />

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 opacity-40" />
              <input
                type="range"
                min="1"
                max="50"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-24 h-1.5 bg-black/10 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-brand-blue"
              />
            </div>

            <button
              onClick={() => setIsRainbow(!isRainbow)}
              className={cn(
                "p-2 rounded-lg transition-all",
                isRainbow
                  ? "bg-linear-to-r from-red-500 via-green-500 to-blue-500 text-white shadow-inner"
                  : "opacity-40 hover:opacity-100",
              )}
              title="Rainbow Mode"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsNeon(!isNeon)}
              className={cn(
                "p-2 rounded-lg transition-all",
                isNeon
                  ? "bg-brand-blue/20 text-brand-blue shadow-inner"
                  : "opacity-40 hover:opacity-100",
              )}
              title="Neon Effect"
            >
              <Zap className="w-4 h-4" />
            </button>

            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded-lg overflow-hidden border-none bg-transparent cursor-pointer hover:scale-110 transition-transform"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clear}
            className="px-4 py-2 hover:bg-red-500/10 text-red-500 rounded-xl transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
          <button
            onClick={download}
            className="px-4 py-2 bg-brand-blue text-white rounded-xl transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-brand-blue/20"
          >
            <Download className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-2xl relative group">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseMove={draw}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
          className="w-full h-full cursor-crosshair block"
        />
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none text-[10px] font-mono uppercase tracking-widest">
          Sava Canvas Engine v2.0
        </div>
      </div>
    </div>
  );
};
