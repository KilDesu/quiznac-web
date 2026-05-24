import { Screen } from "quasar";

export function useScreenXs(): boolean;
export function useScreenXs(strLt: string, strGt?: string): string;
export function useScreenXs(strLt?: string, strGt?: string) {
  if (strLt && strGt) {
    return !Screen.gt.xs ? strLt : strGt;
  }

  if (strLt) {
    return !Screen.gt.xs ? strLt : "";
  }

  return !Screen.gt.xs;
}

export function useScreenSm(): boolean;
export function useScreenSm(strLt: string, strGt?: string): string;
export function useScreenSm(strLt?: string, strGt?: string) {
  if (strLt && strGt) {
    return Screen.gt.xs ? strLt : strGt;
  }

  if (strLt) {
    return Screen.gt.xs ? strLt : "";
  }

  return Screen.gt.xs;
}

export function useScreenMd(): boolean;
export function useScreenMd(strLt: string, strGt?: string): string;
export function useScreenMd(strLt?: string, strGt?: string) {
  if (strLt && strGt) {
    return Screen.gt.sm ? strLt : strGt;
  }

  if (strLt) {
    return Screen.gt.sm ? strLt : "";
  }

  return Screen.gt.sm;
}
