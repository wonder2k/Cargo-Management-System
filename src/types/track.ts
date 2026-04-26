export interface TrackInfo {
  time: string;
  status: string;
  description: string;
  location: string;
  flight_no?: string;
  pieces?: number;
  weight?: number;
}

export interface MawbTrackData {
  number: string;
  carrier_code?: string;
  tracking_info: TrackInfo[];
  latest_status: string;
  origin?: string;
  destination?: string;
}

export interface SeventeenTrackResponse {
  code: number;
  message: string;
  data: {
    accepted: Array<{
      number: string;
      track_info: {
        latest_event?: {
          time: string;
          status: string;
          description: string;
          location: string;
        };
        tracking_full_log: Array<{
          time: string;
          status: string;
          description: string;
          location: string;
          flight_no?: string;
          pieces?: number;
          weight?: number;
        }>;
      };
    }>;
    rejected: Array<{
      number: string;
      error_code?: number;
      error_message?: string;
      error_msg?: string;
      message?: string;
      code?: number;
      error?: {
        code?: number;
        message?: string;
      };
    }>;
  };
}
