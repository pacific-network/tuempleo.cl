import axios from 'axios'
import * as https from 'https'

const BASE_URL = 'https://email.pacificnetwork.cl/publicMailing'

// Pacific Network tiene el certificado SSL expirado
const httpsAgent = new https.Agent({ rejectUnauthorized: false })

interface SendMailOptions {
    dest_email: string
    message_id: string | number
    mail_from?: string
    name_from?: string
    /** Parámetros de personalización (@Nombre@, @Apellido@, etc.) */
    [key: string]: any
}

export async function sendTemplateMail(payload: SendMailOptions) {
    const params = new URLSearchParams({
        username: process.env.PACIFIC_MAIL_USERNAME!,
        password: process.env.PACIFIC_MAIL_PASSWORD!,
        dest_email: payload.dest_email,
        message_id: String(payload.message_id),
        mail_from: payload.mail_from || 'no_reply@tuempleo.cl',
        name_from: payload.name_from || 'TuEmpleo.cl',
        companyCode: process.env.PACIFIC_MAIL_COMPANY_CODE!,
    })

    // Agregar parámetros de personalización (@Param@)
    const reserved = ['dest_email', 'message_id', 'mail_from', 'name_from']
    for (const [key, value] of Object.entries(payload)) {
        if (!reserved.includes(key) && value != null) {
            params.set(key, String(value))
        }
    }

    const url = `${BASE_URL}/sendMailUsingMessage.html?${params.toString()}`
    const { data } = await axios.get(url, { timeout: 15000, httpsAgent })

    // v1 retorna string: "OK<uuid>" en éxito, o mensaje de error
    if (typeof data === 'string' && data.startsWith('OK')) {
        return { uuid: data.replace('OK', ''), status: 'OK' }
    }

    throw new Error(`Pacific Network Mail error: ${data}`)
}

export async function createTemplateFromUrl(subject: string, contentUrl: string) {
    const params = new URLSearchParams({
        username: process.env.PACIFIC_MAIL_USERNAME!,
        password: process.env.PACIFIC_MAIL_PASSWORD!,
        subject,
        contentUrl,
        companyCode: process.env.PACIFIC_MAIL_COMPANY_CODE!,
    })

    const url = `${BASE_URL}/createMessage.html?${params.toString()}`
    const { data } = await axios.get(url, { timeout: 15000, httpsAgent })

    // Retorna "ID:123456" en éxito
    if (typeof data === 'string' && data.startsWith('ID:')) {
        return { messageId: data.replace('ID:', ''), status: 'OK' }
    }

    throw new Error(`Pacific Network createMessage error: ${data}`)
}

export async function checkMailStatus(key: string) {
    const params = new URLSearchParams({
        username: process.env.PACIFIC_MAIL_USERNAME!,
        password: process.env.PACIFIC_MAIL_PASSWORD!,
        key,
        companyCode: process.env.PACIFIC_MAIL_COMPANY_CODE!,
    })

    const url = `${BASE_URL}/mailStatus.html?${params.toString()}`
    const { data } = await axios.get(url, { timeout: 15000, httpsAgent })
    return data
}
