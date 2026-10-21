export interface CartModifier {
  modifierId: string
  qty: number
  catatan: string
}

export interface CartItem {
  qty: number
  modifiers: CartModifier[]
}
