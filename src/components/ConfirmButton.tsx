"use client";

import type { ButtonHTMLAttributes } from "react";

// Botón de envío que pide confirmación antes de continuar (si `confirmar` tiene texto).
export function ConfirmButton({
  confirmar,
  onClick,
  ...props
}: { confirmar?: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="submit"
      {...props}
      onClick={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
        onClick?.(e);
      }}
    />
  );
}
