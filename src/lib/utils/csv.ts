import Papa from "papaparse"

export type DemoRow = {
  player: string
  team: string
  date: string
  points: string; assists: string; rebounds: string;
  fga: string; fgm: string; tpa: string; tpm: string; fta: string; ftm: string;
  turnovers: string; minutes: string;
}

export async function parseCsvText<T = any>(text: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(text, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => resolve(res.data as T[]),
      error: (err: any) => reject(err),
    })
  })
}
