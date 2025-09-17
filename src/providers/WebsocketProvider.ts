import { toast } from 'react-toastify'

export class WebSocketProvider {
  private static connection?: WebSocket
  static baseUrl = 'localhost:3001'

  static closeConnection() {
    if (this.connection) {
      // Clean up event listeners to avoid memory leaks
      this.connection.onclose = null
      this.connection.onerror = null
      this.connection.onmessage = null
      this.connection.onopen = null

      // Close the connection
      this.connection.close()
      this.connection = undefined
    }
  }

  static getConnection(accessToken: string, newConnection = false): WebSocket | undefined {
    if (!this.connection || newConnection) {
      if (newConnection) {
        console.log('Closing old connection before opening new one...')
        this.closeConnection()
      }


      const url = `${ this.baseUrl }?token=${ accessToken }`
      console.log(`Opening new websocket connection to ${ url }`)
      this.connection = new WebSocket(url)

      this.connection.onerror = () => {
        if (typeof window !== "undefined") {
          toast.error('Failed connecting to websocket server')
        }
      }
    }

    return this.connection
  }
}