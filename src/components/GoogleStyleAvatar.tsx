import Image from "next/image";

const GoogleStyleAvatar: React.FC<{ size?: number; src: string }> = ({ size = 100, src }) => {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {}
      <Image
        src={src}
        alt="User Avatar"
        width={size * 0.89}
        height={size * 0.89}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
        }}
      />

      {}
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <mask id="mask0">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M100 50C100 77.6142 77.6142 100 50 100C22.3858 100 0 77.6142 0 50C0 22.3858 22.3858 0 50 0C77.6142 0 100 22.3858 100 50ZM97 50C97 75.9574 75.9574 97 50 97C24.0426 97 3 75.9574 3 50C3 24.0426 24.0426 3 50 3C75.9574 3 97 24.0426 97 50Z"
            fill="white"
          />
        </mask>
        <g mask="url(#mask0)">
          <path d="M0 75V100H96.2L50 50L0 75Z" fill="#34A853" />
          <path d="M0 0V25L50 50L96.2 0H0Z" fill="#EA4335" />
          <path d="M0 75V25L50 50L0 75Z" fill="#FBBC04" />
          <path d="M100 100H96.2L50 50L96.2 0H100V100Z" fill="#4285FA" />
        </g>
      </svg>
    </div>
  );
};

export default GoogleStyleAvatar;
