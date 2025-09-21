/*** Types ***/
export type Marker = {
  id: string;
  time: number; // epoch ms
  color?: string; // tailwind color class or CSS color
  label?: string;
};

export type Clip = {
  id: string;
  start: number; // epoch ms
  end: number; // epoch ms (exclusive)
  color?: string; // background color
  track?: number; // which track row (0..N-1)
  label?: string;
};

export type TimeUnit = "year" | "month" | "day" | "hour" | "minute" | "second";