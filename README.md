# GoSpace

<p style="margin-bottom:0" align='center'>
Video, audio, and canvas sharing app using WebRTC, Socket.io, React.js, and Node.js
</p>

## Features

- **SFU** — Instead of using a P2P mesh network, where all peers are streaming data to each other, a SFU (Selective Forwarding Unit) is used as a proxy to forward data between each other. An SFU enables communication connections that far exceed regular P2P mesh networks in terms of bandwidth optimization.

- **Frontend** — Created using Typescript, [Next.js](https://nextjs.org/), [Mediasoup Client](https://mediasoup.org/documentation/v3/mediasoup-client/), [Socket.io](https://socket.io/), and [DaisyUI](https://daisyui.com/). Enables sharing of audio, cideo, and data sharing of up to 400 concurrent users (one _healthy_ backend server's CPU limit). Currently, only data related to coordinates of html canvas is being shared.

- **Backend API** — Created using Typescript, [Node.js](https://nodejs.org/en/), [Socket.io](https://socket.io/), [Mediasoup](https://mediasoup.org/documentation/v3/mediasoup/design/).

## Plans / To do

##### (in order of importance, kinda)

- [ ] add functionality to select devices
- [ ] put .d types in correct folder
- [ ] producer video/audio feed should be in the corner of the screen, and hideable
- [ ] audio to text translation
- [ ] dockerize frontend and backend
- [ ] sandbox to https://gospace.me
- [ ] auto room name generator, like "shivering mountain" or "volcanic ash" idk
- [x] data producers and data consumers pause functionality?
- [ ] css TV on/off animation
- [ ] finishing implementing debug module instead of console logs
- [x] add room elapsed time

## Quickstart

```
cd backend
npm install
npm run dev

cd frontend
npm install
npm run dev
```

Navigate to http://localhost:3000 for frontend

Because of self generated ssl certs, you might have to navigate to https://localhost:4000 and make sure it (the backend) is not being blocked by the browser, as it most likely is.

## Screenshots

<table align="center">
    <tr>
        <tr>
                    <td align="center" width="50%" height='500'>
                        <img src='https://user-images.githubusercontent.com/29555022/132075789-bb9963fa-bdc7-4945-96cc-c375ae16d767.png'  />
                        <div>Empty room</div>
                    </td>
        </tr>
        <tr>
                     <td align="center" width="50%" height='500'>
                        <img src='https://user-images.githubusercontent.com/29555022/132075790-7bee6175-fbf2-4968-920d-0144f233d538.png'  />
                        <div>Drawing on a canvas, in sync</div>
                    </td>
        </tr>
         <tr>
                    <td align="center" width="50%" height='500'>
                            <img src='https://user-images.githubusercontent.com/29555022/132075791-2ca951c8-2882-44f9-b638-d63b18b80fc0.png'  />
                        <div>4 peer video conference</div>
                    </td>
        </tr>
        <tr>
                   <td align="center" width="50%" height='500'>
                         <img src='https://user-images.githubusercontent.com/29555022/132075788-148332f9-39b4-432e-86e4-351942f1c8ab.png'  />
                        <div>7 peer video conference, the browser is the limit here.</div>
                        <div>It's difficult to test multiple peers without browser testing scripts.</div>
                    </td>
        </tr>
    </tr>
</table>

## License

MIT License
