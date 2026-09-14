export interface PlaywrightTestItem {
  id: string;
  name: string;
  file_path: string;
  line_number: number;
  status: 'passed' | 'failed' | 'running' | 'idle';
  duration_ms?: number;
  error_message?: string;
}

export interface PlaywrightVisualDiffResult {
  baseline_path: string;
  current_path: string;
  diff_percentage: number;
  is_match: boolean;
  diff_image_base64?: string;
}

export interface SlintProperty {
  name: string;
  prop_type: string;
  value: string;
}

export interface SlintComponentDefinition {
  name: string;
  properties: SlintProperty[];
  callbacks: string[];
  children_count: number;
}

export interface EmbeddedDisplayProfile {
  id: string;
  name: string;
  width: number;
  height: number;
  color_mode: 'monochrome' | 'rgb565' | 'rgb888' | 'e-ink';
  default_fps: number;
  vram_bytes: number;
}

export interface EmbeddedSimMetrics {
  fps: number;
  frame_time_ms: number;
  vram_used_bytes: number;
  total_draw_calls: number;
}

export interface IcedWidgetNode {
  id: string;
  widget_type: string;
  bounds: [number, number, number, number];
  padding: [number, number, number, number];
  spacing: number;
  state_summary: string;
  children: IcedWidgetNode[];
}
