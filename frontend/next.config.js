module.exports = {
    pageExtensions: ["mdx", "tsx", "ts"],
    webpack5: true,
    webpack(config) {
        config.module.rules.push({
            test: /\.svg$/,
            use: [{
                loader: "@svgr/webpack",
                options: {
                    svgo: true,
                },
            }, ],
        })

        return config
    },
}