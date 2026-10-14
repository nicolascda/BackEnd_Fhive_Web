// import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: Number(process.env.SMTP_PORT),
//     secure: process.env.SMTP_SECURE === "true",
//     auth: {
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASS
//     }
// });

// const escaparHtml = (texto) => String(texto)
//     .replace(/&/g, "&amp;")
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;")
//     .replace(/"/g, "&quot;")
//     .replace(/'/g, "&#039;");

// const modeloEmail = (nome, codigo, configuracao) => `
// <!DOCTYPE html>
// <html lang="pt-BR">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>${escaparHtml(configuracao.titulo)} - Fhive</title>
// </head>

// <body style="margin:0;padding:0;background-color:#f5efe8;font-family:Arial,Helvetica,sans-serif;">
//     <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5efe8;padding:40px 20px;">
//         <tr>
//             <td align="center">
//                 <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:14px;overflow:hidden;">
//                     <tr>
//                         <td align="center" style="background-color:#a85b16;padding:30px 20px;">
//                             <div style="color:#f4c542;font-size:32px;font-weight:bold;letter-spacing:3px;">
//                                 FHIVE
//                             </div>
//                             <div style="color:#ffffff;font-size:14px;margin-top:8px;">
//                                 Tecnologia para uma vida mais inteligente
//                             </div>
//                         </td>
//                     </tr>

//                     <tr>
//                         <td style="padding:40px 35px;color:#3f2a1d;">
//                             <h1 style="margin:0 0 18px;color:#a85b16;font-size:25px;">
//                                 ${escaparHtml(configuracao.titulo)}
//                             </h1>

//                             <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">
//                                 Olá, <strong>${escaparHtml(nome)}</strong>.
//                             </p>

//                             <p style="margin:0 0 25px;font-size:16px;line-height:1.6;">
//                                 ${escaparHtml(configuracao.mensagem)}
//                             </p>

//                             <div style="margin:30px 0;padding:22px;background-color:#fff7d6;border:2px solid #f4c542;border-radius:12px;text-align:center;">
//                                 <div style="color:#6b472d;font-size:13px;font-weight:bold;margin-bottom:10px;letter-spacing:1px;">
//                                     ${escaparHtml(configuracao.rotuloCodigo)}
//                                 </div>

//                                 <div style="color:#a85b16;font-size:36px;font-weight:bold;letter-spacing:8px;">
//                                     ${escaparHtml(codigo)}
//                                 </div>
//                             </div>

//                             <p style="margin:0 0 10px;color:#6b625c;font-size:14px;line-height:1.5;">
//                                 Este código é válido por ${escaparHtml(configuracao.validade)}.
//                             </p>

//                             <p style="margin:0;color:#6b625c;font-size:14px;line-height:1.5;">
//                                 ${escaparHtml(configuracao.aviso)}
//                             </p>
//                         </td>
//                     </tr>

//                     <tr>
//                         <td align="center" style="background-color:#3f2a1d;padding:22px 20px;">
//                             <div style="color:#f4c542;font-size:15px;font-weight:bold;">
//                                 Fhive
//                             </div>
//                             <div style="color:#d9d1ca;font-size:12px;margin-top:6px;">
//                                 Este e-mail foi enviado automaticamente.
//                             </div>
//                         </td>
//                     </tr>
//                 </table>
//             </td>
//         </tr>
//     </table>
// </body>
// </html>
// `;

// export const enviarCodigoConfirmacao = async (
//     email,
//     nome,
//     codigo
// ) => {
//     await transporter.sendMail({
//         from: process.env.SMTP_FROM,
//         to: email,
//         subject: "Confirme seu e-mail - Fhive",
//         text: `Olá, ${nome}. Seu código de confirmação do Fhive é ${codigo}. Ele é válido por 10 minutos.`,
//         html: modeloEmail(nome, codigo, {
//             titulo: "Confirme seu e-mail",
//             mensagem: "Para concluir seu cadastro no Fhive, digite o código abaixo no aplicativo:",
//             rotuloCodigo: "CÓDIGO DE CONFIRMAÇÃO",
//             validade: "10 minutos",
//             aviso: "Caso você não tenha solicitado este cadastro, ignore este e-mail."
//         })
//     });
// };

// export const enviarCodigoRecuperacaoSenha = async (
//     email,
//     nome,
//     codigo
// ) => {
//     await transporter.sendMail({
//         from: process.env.SMTP_FROM,
//         to: email,
//         subject: "Redefinição de senha - Fhive",
//         text: `Olá, ${nome}. Seu código para redefinir a senha do Fhive é ${codigo}. Ele é válido por 1 hora. Se você não solicitou essa alteração, ignore este e-mail.`,
//         html: modeloEmail(nome, codigo, {
//             titulo: "Redefina sua senha",
//             mensagem: "Recebemos uma solicitação para redefinir a senha da sua conta Fhive. Use o código abaixo junto com sua nova senha no aplicativo:",
//             rotuloCodigo: "CÓDIGO DE RECUPERAÇÃO",
//             validade: "1 hora",
//             aviso: "Se você não solicitou a redefinição da senha, ignore este e-mail. Sua senha não será alterada sem a confirmação do código."
//         })
//     });
// };

import nodemailer from "nodemailer";

let transporter;

const obterTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    return transporter;
};

const escaparHtml = (texto) =>
    String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

const rodapeEmail = `
    <tr>
        <td align="center" style="
            background-color: #3f2a1d;
            padding: 24px 20px;
        ">
            <div style="
                color: #f4c542;
                font-size: 16px;
                font-weight: bold;
                letter-spacing: 2px;
            ">
                FHIVE
            </div>

            <div style="
                color: #d9d1ca;
                font-size: 12px;
                margin-top: 8px;
            ">
                Tecnologia para uma vida mais inteligente
            </div>

            <div style="
                color: #b7a99e;
                font-size: 11px;
                margin-top: 14px;
            ">
                Mensagem automática. Não responda a este e-mail.
            </div>
        </td>
    </tr>
`;

const modeloConfirmacao = (nome, codigo) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirme seu e-mail - Fhive</title>
</head>

<body style="
    margin: 0;
    padding: 0;
    background-color: #f5efe8;
    font-family: Arial, Helvetica, sans-serif;
">
    <table width="100%" cellpadding="0" cellspacing="0" style="
        background-color: #f5efe8;
        padding: 35px 15px;
    ">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="
                    max-width: 600px;
                    background-color: #ffffff;
                    border-radius: 14px;
                    overflow: hidden;
                ">
                    <tr>
                        <td align="center" style="
                            background-color: #a85b16;
                            padding: 30px 20px;
                        ">
                            <div style="
                                color: #f4c542;
                                font-size: 34px;
                                font-weight: bold;
                                letter-spacing: 4px;
                            ">
                                FHIVE
                            </div>

                            <div style="
                                color: #ffffff;
                                font-size: 14px;
                                margin-top: 8px;
                            ">
                                Seu próximo passo começa aqui.
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td style="
                            padding: 38px 32px;
                            color: #3f2a1d;
                        ">
                            <h1 style="
                                margin: 0 0 20px;
                                color: #a85b16;
                                font-size: 25px;
                            ">
                                Confirme seu e-mail
                            </h1>

                            <p style="
                                margin: 0 0 16px;
                                font-size: 16px;
                                line-height: 1.7;
                            ">
                                Olá, <strong>${escaparHtml(nome)}</strong>!
                            </p>

                            <p style="
                                margin: 0 0 26px;
                                font-size: 15px;
                                line-height: 1.8;
                                color: #66564a;
                            ">
                                Estamos felizes em ter você no Fhive.
                                Para concluir seu cadastro, informe o
                                código abaixo no aplicativo.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="
                                background-color: #fff7d6;
                                border: 2px solid #f4c542;
                                border-radius: 12px;
                            ">
                                <tr>
                                    <td align="center" style="padding: 26px 12px;">
                                        <div style="
                                            color: #6b472d;
                                            font-size: 12px;
                                            font-weight: bold;
                                            letter-spacing: 1.5px;
                                        ">
                                            CÓDIGO DE CONFIRMAÇÃO
                                        </div>

                                        <div style="
                                            margin-top: 15px;
                                            color: #a85b16;
                                            font-size: 36px;
                                            font-weight: bold;
                                            letter-spacing: 8px;
                                        ">
                                            ${escaparHtml(codigo)}
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <p style="
                                margin: 22px 0 10px;
                                color: #6b625c;
                                font-size: 13px;
                                line-height: 1.7;
                            ">
                                Este código é válido por
                                <strong>10 minutos</strong>.
                            </p>

                            <p style="
                                margin: 0;
                                color: #6b625c;
                                font-size: 13px;
                                line-height: 1.7;
                            ">
                                Se você não iniciou este cadastro,
                                basta ignorar esta mensagem.
                            </p>
                        </td>
                    </tr>

                    ${rodapeEmail}
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

const modeloRecuperacao = (nome, codigo) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperação de senha - Fhive</title>
</head>

<body style="
    margin: 0;
    padding: 0;
    background-color: #f5efe8;
    font-family: Arial, Helvetica, sans-serif;
">
    <table width="100%" cellpadding="0" cellspacing="0" style="
        background-color: #f5efe8;
        padding: 35px 15px;
    ">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="
                    max-width: 600px;
                    background-color: #ffffff;
                    border-radius: 14px;
                    overflow: hidden;
                ">
                    <tr>
                        <td align="center" style="
                            background-color: #a85b16;
                            padding: 30px 20px;
                        ">
                            <div style="
                                color: #f4c542;
                                font-size: 34px;
                                font-weight: bold;
                                letter-spacing: 4px;
                            ">
                                FHIVE
                            </div>

                            <div style="
                                color: #ffffff;
                                font-size: 14px;
                                margin-top: 8px;
                            ">
                                Segurança da sua conta
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td style="
                            padding: 38px 32px;
                            color: #3f2a1d;
                        ">
                            <div style="
                                margin-bottom: 12px;
                                color: #a85b16;
                                font-size: 12px;
                                font-weight: bold;
                                letter-spacing: 1.5px;
                            ">
                                RECUPERAÇÃO DE ACESSO
                            </div>

                            <h1 style="
                                margin: 0 0 20px;
                                color: #a85b16;
                                font-size: 26px;
                                line-height: 1.35;
                            ">
                                Vamos recuperar sua senha.
                            </h1>

                            <p style="
                                margin: 0 0 16px;
                                font-size: 16px;
                                line-height: 1.7;
                            ">
                                Olá, <strong>${escaparHtml(nome)}</strong>!
                            </p>

                            <p style="
                                margin: 0 0 26px;
                                color: #66564a;
                                font-size: 15px;
                                line-height: 1.8;
                            ">
                                Recebemos uma solicitação para redefinir
                                a senha da sua conta Fhive. Para continuar,
                                informe o código abaixo junto com sua
                                nova senha no aplicativo.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="
                                background-color: #fff7d6;
                                border: 2px solid #f4c542;
                                border-radius: 12px;
                            ">
                                <tr>
                                    <td align="center" style="
                                        padding: 26px 12px;
                                    ">
                                        <div style="
                                            color: #6b472d;
                                            font-size: 12px;
                                            font-weight: bold;
                                            letter-spacing: 1.5px;
                                        ">
                                            CÓDIGO DE RECUPERAÇÃO
                                        </div>

                                        <div style="
                                            margin-top: 15px;
                                            color: #a85b16;
                                            font-size: 36px;
                                            font-weight: bold;
                                            letter-spacing: 8px;
                                        ">
                                            ${escaparHtml(codigo)}
                                        </div>

                                        <div style="
                                            margin-top: 15px;
                                            color: #6b625c;
                                            font-size: 13px;
                                        ">
                                            Código válido por 1 hora
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <table width="100%" cellpadding="0" cellspacing="0" style="
                                margin-top: 26px;
                                background-color: #f8f4ef;
                                border-left: 4px solid #a85b16;
                            ">
                                <tr>
                                    <td style="padding: 16px 18px;">
                                        <div style="
                                            margin-bottom: 6px;
                                            color: #a85b16;
                                            font-size: 14px;
                                            font-weight: bold;
                                        ">
                                            Aviso de segurança
                                        </div>

                                        <div style="
                                            color: #66564a;
                                            font-size: 13px;
                                            line-height: 1.7;
                                        ">
                                            Se você não solicitou a
                                            recuperação da senha, ignore
                                            este e-mail. Sua senha não
                                            será alterada sem a confirmação
                                            do código.
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <p style="
                                margin: 24px 0 0;
                                color: #6b625c;
                                font-size: 13px;
                                line-height: 1.7;
                            ">
                                Por segurança, não compartilhe este
                                código com outras pessoas.
                            </p>
                        </td>
                    </tr>

                    ${rodapeEmail}
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
    await obterTransporter().sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: "Confirme seu e-mail - Fhive",
        text:
            `Olá, ${nome}. Seu código de confirmação do Fhive é ` +
            `${codigo}. Ele é válido por 10 minutos.`,
        html: modeloConfirmacao(nome, codigo)
    });
};

export const enviarCodigoRecuperacaoSenha = async (
    email,
    nome,
    codigo
) => {
    await obterTransporter().sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: "Recuperação de senha - Fhive",
        text:
            `Olá, ${nome}. Seu código para redefinir a senha do Fhive é ` +
            `${codigo}. Ele é válido por 1 hora. ` +
            "Se você não solicitou esta alteração, ignore este e-mail.",
        html: modeloRecuperacao(nome, codigo)
    });
};