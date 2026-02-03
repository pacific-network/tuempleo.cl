import axios from 'axios'

export async function sendTemplateMail(payload: any) {
    return axios.put(
        process.env.PACIFIC_MAIL_API_URL!,
        payload,
        {
            headers: {
                Authorization: `Bearer ${process.env.PACIFIC_MAIL_TOKEN}`,
                companyCode: process.env.PACIFIC_COMPANY_CODE,
                'Content-Type': 'application/json',
            },
            timeout: 15000,
        },
    )
}
