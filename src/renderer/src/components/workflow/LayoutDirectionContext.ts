import { createContext } from 'react'

export type LayoutDirection = 'horizontal' | 'vertical'

export const LayoutDirectionContext = createContext<LayoutDirection>('horizontal')
