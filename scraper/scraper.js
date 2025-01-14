const jsdom = require('jsdom')
const { JSDOM } = jsdom
const axios = require('axios')

async function scrapping(url) {
    try {
        const response = await axios(`${url}`)
        return response.data
    } catch (err) {
        console.log(err)
    }
}

async function getJSON(res, url, numPage, video, maxResult) {
    try {
        const html = await scrapping(url)
        const { window } = new JSDOM(html)
        const result = []

        const movies = Array.from(window.document.querySelectorAll('.movies-list .ml-item')).slice(0, maxResult)
        await Promise.all(movies.map(async movie => {
            const officialWeb = movie.querySelector('.ml-mask').getAttribute('href')
            const quality = movie.querySelector('.mli-quality').textContent
            const episode = (movie.querySelector('.mli-eps')) ? movie.querySelector('.mli-eps').textContent : null
            const rating = movie.querySelector('.mli-rating').textContent
            const thumbnail = movie.querySelector('img').getAttribute('data-original')
            const title = movie.querySelector('.mli-info h2').textContent
            const movieId = movie.dataset.movieId

            result.push({
                title,
                thumbnailPotrait: thumbnail,
                rating,
                quality,
                episode,
                officialWeb,
                movieId,
                detail: await detailMovie(officialWeb),
                video: await getIframe(officialWeb, video)
            })
        }))

        result.forEach(movie => {
            for (const data in movie.detail) {
                if (movie.detail[data] === null || movie.detail[data] === 0) {
                    delete movie.detail[data]
                }
            }
            delete movie.officialWeb
        })

        res.json({ result, length: `${movies.length}`, page: numPage })

    } catch (err) {
        console.log(err)
    }
}

async function detailMovie(officialWeb) {

    if (officialWeb.includes('tvshows')) {
        const urlTemp = new URL(officialWeb).toString().split('/tvshows').join("")
        const url = new URL(urlTemp)

        officialWeb = `${url.origin}/episodes${url.pathname}-1x1/play`
    }

    const html = await axios(officialWeb)
    const { window } = new JSDOM(html.data)

    const views = window.document.querySelector('.mvic-desc .mvic-info .mvici-left').children.item(0).textContent.split(" ").slice(1).join(" ")
    const genre = window.document.querySelector('.mvic-desc .mvic-info .mvici-left').children.item(1).textContent.split(" ").slice(1).join(" ")
    const director = window.document.querySelector('.mvic-desc .mvic-info .mvici-left').children.item(2).querySelector('span').textContent
    const actors = window.document.querySelector('.mvic-desc .mvic-info .mvici-left').children.item(3).querySelector('span').textContent
    const country = window.document.querySelector('.mvic-desc .mvic-info .mvici-left').children.item(4).children.item(1).textContent

    const duration = window.document.querySelector(".mvic-desc .mvic-info .mvici-right span[itemprop='duration']").textContent
    const release = window.document.querySelector('.mvic-desc .mvic-info .mvici-right').children.item(2).textContent.split(" ").slice(1).join(" ")
    const description = window.document.querySelector('.mvic-desc .desc').textContent
    const thumbnailLandscape = window.document.querySelector('#mv-info a').getAttribute('style').split(" ").slice(1).join("").split("url").slice(1).join("").split("(").slice(1).join("").split(")").join("")
    const trailer = window.document.querySelector('.mvic-desc').children.item(1).children.item(0).getAttribute('href')
    const eps = window.document.querySelectorAll('.episodios a').length

    return {
        trailer: trailer ? trailer : null,
        views: views ? views : null,
        genre: genre ? genre : null,
        director: director ? director : null,
        actors: actors ? actors : null,
        country: country ? country : null,
        duration: duration ? duration : null,
        release: release ? release : null,
        thumbnailLandscape: thumbnailLandscape ? thumbnailLandscape : null,
        description: description ? description : null,
        totalEpisodes: eps ? eps : null
    }
}

async function getIframe(officialWeb, video) {
    try {
        if (video == 'gdrive') {
            return await getVideoLink(await videoURL(officialWeb))
        } else if (video == "iframe") {
            return await videoURL(officialWeb)
        } else {
            return
        }
    } catch (err) {
        console.log(err)
    }
}

async function videoURL(officialWeb) {
    let playVideo = `${officialWeb}/play`
    let response = await axios(playVideo)
    let { window } = new JSDOM(response.data)
    let iframe = window.document.querySelector('.iframe #myFrame').getAttribute('src')

    if (iframe === undefined || iframe === null) {
        const urlTemp = new URL(officialWeb).toString().split('/tvshows').join("")
        const url = new URL(urlTemp)

        playVideo = `${url.origin}/episodes${url.pathname}-1x1/play`
        response = await axios(playVideo)
        const { window } = new JSDOM(response.data)
        iframe = window.document.querySelector('.iframe #myFrame').getAttribute('src')
    }

    return iframe
}

async function getVideoLink(iframe) {
    try {
        const response = await axios(iframe)
        const { window } = new JSDOM(response.data)
        const linkVideo = window.document.querySelector("iframe").src
        return linkVideo
    } catch (err) {
        return "Server Error"
    }
}

module.exports = { getJSON, scrapping, getVideoLink }