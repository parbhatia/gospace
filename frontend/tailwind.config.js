module.exports = {
    purge: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
    darkMode: false, // or 'media' or 'class'
    theme: {
        extend: {
            colors: {
                'volume-meter': '#7BE495',
            },
            gridTemplateRows: {
                // Simple 8 row grid
                '8': 'repeat(8, minmax(0, 1fr))',

                // Complex site-specific row configuration
                'app': 'auto 80% auto',
            },
            gridTemplateColumns: {
                'custom': 'minmax(auto, 50%) 1fr 3em',
            },
            gridAutoRows: {
                '2fr': 'minmax(100px, auto)',
            }
        }
    },
    variants: {
        extend: {},
    },
    plugins: [
        require('daisyui'),
    ],
}