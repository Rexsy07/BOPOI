import React from 'react';
import {
  BopoiCyberMascot,
  BopoiCyberMascotProps,
  MascotMood,
  MascotEntrance,
  MascotIdle,
} from './BopoiCyberMascot.tsx';

export interface BopoiInteractiveMascotProps extends BopoiCyberMascotProps {}

export const BopoiInteractiveMascot: React.FC<BopoiInteractiveMascotProps> = (props) => {
  return <BopoiCyberMascot {...props} />;
};

export { BopoiCyberMascot };
export type { MascotMood, MascotEntrance, MascotIdle };
