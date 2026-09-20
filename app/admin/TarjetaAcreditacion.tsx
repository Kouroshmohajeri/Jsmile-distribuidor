"use client";

import { useState } from "react";

type Props = {
  name: string;
  imageUrl: string;
  accreditationNumber: string;
};

export default function TarjetaAcreditacion3D({
  name,
  imageUrl,
  accreditationNumber,
}: Props) {
  const [rotation, setRotation] = useState({
    x: 0,
    y: 0,
  });

  function updateRotation(
    clientX: number,
    clientY: number,
    element: HTMLDivElement,
  ) {
    const rect = element.getBoundingClientRect();

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const rotateY = (x / rect.width - 0.5) * 24;
    const rotateX = -(y / rect.height - 0.5) * 20;

    setRotation({
      x: rotateX,
      y: rotateY,
    });
  }

  return (
    <div>
      <div
        className="flex justify-center py-5"
        style={{
          perspective: "1400px",
        }}
      >
        <div
          className="relative w-[280px] max-w-full touch-none select-none"
          style={{
            aspectRatio: "0.67",
            transformStyle: "preserve-3d",
            transform: `
              rotateX(${rotation.x}deg)
              rotateY(${rotation.y}deg)
            `,
            transition:
              rotation.x === 0 && rotation.y === 0
                ? "transform 500ms cubic-bezier(.2,.8,.2,1)"
                : "none",
          }}
          onMouseMove={(event) =>
            updateRotation(event.clientX, event.clientY, event.currentTarget)
          }
          onMouseLeave={() =>
            setRotation({
              x: 0,
              y: 0,
            })
          }
          onTouchMove={(event) => {
            const touch = event.touches[0];

            updateRotation(touch.clientX, touch.clientY, event.currentTarget);
          }}
          onTouchEnd={() =>
            setRotation({
              x: 0,
              y: 0,
            })
          }
        >
          {/* CARD THICKNESS */}
          <div
            className="absolute inset-0 rounded-[22px] bg-[#063b4a]"
            style={{
              transform: "translateZ(-10px)",
            }}
          />

          <div
            className="absolute inset-0 rounded-[22px] bg-[#0b5062]"
            style={{
              transform: "translateZ(-6px)",
            }}
          />

          {/* CARD */}
          <div
            className="relative h-full w-full overflow-hidden rounded-[22px] bg-white shadow-[0_30px_70px_rgba(0,0,0,.3)]"
            style={{
              transform: "translateZ(10px)",
              backfaceVisibility: "hidden",
            }}
          >
            {/* TOP DECORATION */}
            <div className="absolute inset-x-0 top-0 h-[27%] overflow-hidden">
              <div className="absolute -left-[25%] -top-[60%] h-[150%] w-[80%] rounded-full bg-[#075166]" />

              <div className="absolute -right-[25%] -top-[60%] h-[150%] w-[80%] rounded-full bg-[#43a51b]" />

              <div className="absolute left-1/2 top-[12%] -translate-x-1/2 text-center">
                <div className="text-[34px] font-black tracking-[3px] text-[#075166]">
                  JSMILE
                </div>

                <div className="text-[8px] font-bold tracking-[1.5px] text-[#075166]">
                  WWW.JSMILE.ES
                </div>

                <div className="mt-1 text-[7px] font-bold tracking-[1px] text-[#075166]">
                  CONECTAMOS LO QUE{" "}
                  <span className="text-[#43a51b]">IMPORTA</span>
                </div>
              </div>
            </div>

            {/* TITLE */}
            <div className="absolute left-[7%] right-[7%] top-[28%] flex items-center gap-2">
              <div className="h-px flex-1 bg-[#075166]/40" />

              <span className="whitespace-nowrap text-[7px] font-black tracking-[1.7px] text-[#075166]">
                ACREDITACIÓN OFICIAL
              </span>

              <div className="h-px flex-1 bg-[#075166]/40" />
            </div>

            {/* PERSON */}
            <div className="absolute left-[7%] right-[7%] top-[33%] flex gap-3">
              {/* PHOTO */}
              <div className="w-[42%] shrink-0 overflow-hidden rounded-xl border border-[#075166]">
                <div className="aspect-[0.82] bg-[#eef0f2]">
                  <img
                    src={imageUrl}
                    alt={name}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </div>

                <div className="bg-[#075166] px-1 py-2 text-center text-white">
                  <p className="text-[5px] font-bold uppercase">
                    Nº ACREDITACIÓN
                  </p>

                  <p className="mt-0.5 text-[11px] font-black">
                    {accreditationNumber}
                  </p>
                </div>
              </div>

              {/* NAME */}
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-[17px] font-black uppercase leading-[0.95] text-[#075166]">
                  {name}
                </h3>

                <div className="mt-2 h-px bg-[#075166]/50" />

                <p className="mt-2 text-[8px] font-black uppercase text-[#075166]">
                  ASESOR COMERCIAL
                </p>

                <p className="mt-2 text-[6.5px] leading-[1.45] text-[#222]">
                  Esta acreditación certifica que el portador está autorizado
                  para ofrecer y comercializar nuestros productos y servicios.
                </p>

                <div className="mt-4 text-center">
                  <div className="font-serif text-[17px] italic">JSMILE</div>

                  <p className="text-[5px] font-bold text-[#075166]">
                    DIRECCIÓN JSMILE
                  </p>
                </div>
              </div>
            </div>

            {/* SERVICES */}
            <div className="absolute left-[7%] right-[7%] top-[59%] border-t border-[#075166]/40 pt-2">
              <div className="grid grid-cols-3 text-center">
                <Service icon="⌁" title="FIBRA + MÓVIL" />

                <Service icon="⚡" title="ENERGÍA" />

                <Service icon="♙" title="ALARMAS" />
              </div>
            </div>

            {/* BRANDS */}
            <div className="absolute left-[7%] right-[7%] top-[68%]">
              <p className="text-center text-[6px] font-black tracking-[1.5px] text-[#075166]">
                MARCAS AUTORIZADAS
              </p>

              <div className="mt-2 grid grid-cols-4 gap-y-2 text-center text-[7px] font-black text-[#222]">
                <span>O₂</span>
                <span>Lowi</span>
                <span>vodafone</span>
                <span>finetwork</span>
                <span>segurma</span>
                <span>3D</span>
                <span>ADT</span>
                <span>Endesa</span>
                <span>Naturgy</span>
                <span>Iberdrola</span>
                <span>Gana Energía</span>
                <span>WiBe</span>
              </div>
            </div>

            {/* FOOTER */}
            <div className="absolute bottom-0 left-0 right-0 h-[17%] bg-[#075166]">
              <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center gap-1 px-3 text-white">
                <div>
                  <p className="text-[5px] font-bold uppercase">
                    Contacto empresa
                  </p>

                  <p className="mt-1 text-[9px] font-black">681 800 455</p>

                  <p className="mt-1 text-[5px]">www.jsmile.es</p>
                </div>

                {/* QR */}
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white">
                  <div className="grid grid-cols-5 gap-[2px]">
                    {Array.from({ length: 25 }).map((_, index) => (
                      <span
                        key={index}
                        className={`h-[4px] w-[4px] ${
                          (index * 7) % 11 < 5 ? "bg-black" : "bg-white"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[5px] font-bold uppercase">
                    Contacto comercial
                  </p>

                  <p className="mt-1 text-[9px] font-black">610 402 067</p>

                  <p className="mt-1 text-[5px]">Verifica esta acreditación</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs font-semibold text-[#777b87]">
          Mueve el dedo sobre la tarjeta para verla en 3D
        </p>

        <div className="mt-3 flex justify-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#075166]" />
          <span className="h-2 w-2 rounded-full bg-[#d8dfe3]" />
          <span className="h-2 w-2 rounded-full bg-[#d8dfe3]" />
        </div>
      </div>
    </div>
  );
}

function Service({ icon, title }: { icon: string; title: string }) {
  return (
    <div>
      <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-[#075166] text-xs text-white">
        {icon}
      </div>

      <p className="mt-1 text-[5px] font-black text-[#075166]">{title}</p>
    </div>
  );
}
