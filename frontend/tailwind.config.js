module.exports = {
    purge: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
    darkMode: false, // or 'media' or 'class'
    theme: {
        extend: {
            colors: {
                'volume-meter': '#7BE495',
            },
            // gridTemplateRows: {
            //     // Simple 8 row grid
            //     '8': 'repeat(8, minmax(0, 1fr))',

            //     // Complex site-specific row configuration
            //     'works': 'repeat(auto-fill, minmax(200px, 1fr))',
            //     'custom': 'repeat(auto-fill,  minmax(min-content, 1fr))',
            //     'steal': 'repeat(3, 100px)',
            // },
            // gridTemplateColumns: {
            //     'custom': 'minmax(auto, 50%) 1fr 3em',
            //     'steal': 'repeat(3, minmax(100px, 1fr))',
            // }
        }
    },
    variants: {
        extend: {},
    },
    plugins: [],
}