import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const escaparHtml = (texto) => {
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

const modeloEmail = (nome, codigo) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmação de e-mail - Fhive</title>
</head>

<body style="
    margin: 0;
    padding: 0;
    background-color: #f5efe8;
    font-family: Arial, Helvetica, sans-serif;
">

<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    style="
        background-color: #f5efe8;
        padding: 40px 20px;
    "
>
    <tr>
        <td align="center">

            <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                    max-width: 600px;
                    background-color: #ffffff;
                    border-radius: 14px;
                    overflow: hidden;
                "
            >

                <tr>
                    <td
                        align="center"
                        style="
                            background-color: #a85b16;
                            padding: 30px 20px;
                        "
                    >
                        <div style="
                            color: #f4c542;
                            font-size: 32px;
                            font-weight: bold;
                            letter-spacing: 3px;
                        ">
                            FHIVE
                        </div>

                        <div style="
                            color: #ffffff;
                            font-size: 14px;
                            margin-top: 8px;
                        ">
                            Tecnologia para uma vida mais inteligente
                        </div>
                    </td>
                </tr>

                <tr>
                    <td
                        style="
                            padding: 40px 35px;
                            color: #3f2a1d;
                        "
                    >

                        <h1 style="
                            margin: 0 0 18px;
                            color: #a85b16;
                            font-size: 25px;
                        ">
                            Confirme seu e-mail
                        </h1>

                        <p style="
                            margin: 0 0 14px;
                            font-size: 16px;
                            line-height: 1.6;
                        ">
                            Olá,
                            <strong>${escaparHtml(nome)}</strong>.
                        </p>

                        <p style="
                            margin: 0 0 25px;
                            font-size: 16px;
                            line-height: 1.6;
                        ">
                            Para concluir seu cadastro no Fhive,
                            digite o código abaixo no aplicativo:
                        </p>

                        <div style="
                            margin: 30px 0;
                            padding: 22px;
                            background-color: #fff7d6;
                            border: 2px solid #f4c542;
                            border-radius: 12px;
                            text-align: center;
                        ">

                            <div style="
                                color: #6b472d;
                                font-size: 13px;
                                font-weight: bold;
                                margin-bottom: 10px;
                                letter-spacing: 1px;
                            ">
                                CÓDIGO DE CONFIRMAÇÃO
                            </div>

                            <div style="
                                color: #a85b16;
                                font-size: 36px;
                                font-weight: bold;
                                letter-spacing: 8px;
                            ">
                                ${codigo}
                            </div>

                        </div>

                        <p style="
                            margin: 0 0 10px;
                            color: #6b625c;
                            font-size: 14px;
                            line-height: 1.5;
                        ">
                            Este código é válido por 10 minutos.
                        </p>

                        <p style="
                            margin: 0;
                            color: #6b625c;
                            font-size: 14px;
                            line-height: 1.5;
                        ">
                            Caso você não tenha solicitado este cadastro,
                            ignore este e-mail.
                        </p>

                    </td>
                </tr>

                <tr>
                    <td
                        align="center"
                        style="
                            background-color: #3f2a1d;
                            padding: 22px 20px;
                        "
                    >
                        <div style="
                            color: #f4c542;
                            font-size: 15px;
                            font-weight: bold;
                        ">
                            Fhive
                        </div>

                        <div style="
                            color: #d9d1ca;
                            font-size: 12px;
                            margin-top: 6px;
                        ">
                            Este e-mail foi enviado automaticamente.
                        </div>
                    </td>
                </tr>

            </table>

        </td>
    </tr>
</table>

</body>
</html>
`;

export const enviarCodigoConfirmacao = async (
    email,
    nome,
    codigo
) => {
    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: "Confirme seu e-mail - Fhive",
        text:
            `Olá, ${nome}. ` +
            `Seu código de confirmação do Fhive é ${codigo}. ` +
            `Ele é válido por 10 minutos.`,
        html: modeloEmail(nome, codigo)
    });
};