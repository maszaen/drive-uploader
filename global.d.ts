declare namespace JSX {
  interface IntrinsicElements {
    input: React.DetailedHTMLProps<
      React.InputHTMLAttributes<HTMLInputElement> & { 
        webkitdirectory?: string | boolean; 
        directory?: string | boolean;
      },
      HTMLInputElement
    >;
  }
}