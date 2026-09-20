"use client";

import TarjetaAcreditacion3D from "./TarjetaAcreditacion";

type User = {
  _id: string;
  name: string;
  email: string;
  imageUrl?: string;
  accreditationNumber?: string;
};

type Props = {
  user: User;
  onClose: () => void;
};

export default function TarjetaAcreditacionModal({ user, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07111dcc] p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-[#f7f8fa] shadow-[0_30px_100px_rgba(0,0,0,.3)]">
        {/* HEADER */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e7e9ee] bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[2px] text-[#8a7b4f]">
              Acreditación
            </p>

            <h2 className="mt-0.5 text-lg font-black text-[#11183c]">
              Tarjeta de Acreditación
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f2f5] text-xl text-[#555b68] transition hover:bg-[#e7e9ee]"
          >
            ×
          </button>
        </div>

        {/* CARD */}
        <div className="p-4 sm:p-7">
          <TarjetaAcreditacion3D
            name={user.name}
            imageUrl={user.imageUrl || "/assets/default-avatar.png"}
            accreditationNumber={user.accreditationNumber || "JSM-0147"}
          />
        </div>
      </div>
    </div>
  );
}
