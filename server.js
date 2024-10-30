const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);



const app = express();
const port = 3000;

app.use(express.static('public')); // se a pasta de imagens estiver dentro de "public"


// Gerar um token
const token = crypto.randomBytes(20).toString('hex');


// Decodificar um token
const decodedToken = decodeURIComponent(token);



// Configurar o multer para upload de arquivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });


// Configuração do EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configurar o body-parser para processar requisições JSON
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Conectar ao banco de dados MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'STUDENTOOK'
});

 

// Configuração da sessão com MySQL
const sessionStore = new MySQLStore({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'STUDENTOOK'
});

app.use(session({
    secret: 'senhasupersecreta',
    resave: false,
    saveUninitialized: false,
    store: sessionStore, //MySQL como armazenamento de sessão
    cookie: { secure: false }
}));

db.connect(err => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        return;
    }
    console.log('Conectado ao banco de dados MySQL');
});

// Rota para processar o login e armazenar o usuário na sessão
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Verificar se os campos não estão vazios
    if (!username || !password) {
        return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios' });
    }

    const query = "SELECT id, senha FROM usuarios WHERE nome = ?";
    db.execute(query, [username], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Erro no servidor' });
        }

        if (results.length > 0) {
            const user = results[0]; // Pegando o usuário retornado no banco

            // Comparar a senha usando bcrypt
            bcrypt.compare(password, user.senha, (err, result) => {
                if (err) {
                    return res.status(500).json({ message: 'Erro ao comparar a senha' });
                }

                if (result) {
                    req.session.userId = user.id;  // Salvando o ID do usuário na sessão
                    res.redirect('/menu'); // Redirecionando para a próxima página
                } else {
                    res.status(401).json({ message: 'Nome de usuário ou senha incorretos' });
                }
            });
        } else {
            res.status(401).json({ message: 'Usuário não encontrado' });
        }
    });
});




// Middleware para verificar se o usuário está logado
function checkLogin(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/');
    }
}


// Logout do usuário e destruir a sessão
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Erro ao encerrar sessão');
        }
        res.redirect('/');
    });
});



// Servir arquivos estáticos da pasta public
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));




// Rota para a tela de início (HTML)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});


// Rota para a próxima tela (HTML)
app.get('/next', (req, res) => {
    res.sendFile(__dirname + '/tela_2.html');
});

app.get('/menu', checkLogin, (req, res) => {
    res.sendFile(__dirname + '/menu.html');
});



// Rota para a tela de cadastro (HTML)
app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/registrar.html');
});




// Rota para a tela de recuperação de senha (HTML)
app.get('/recover', (req, res) => {
    res.sendFile(__dirname + '/recuperar_senha.html');
});




// Rota para a tela de sucesso de login (HTML)
app.get('/success', (req, res) => {
    res.sendFile(__dirname + '/success.html');
});




// Rota para a tela do menu (HTML)
app.get('/menu', (req, res) => {
    res.sendFile(__dirname + '/menu.html');
});




// Rota para obter livros por categoria
app.get('/api/books', (req, res) => {
    const category = req.params.category;
    const query = 'SELECT titulo FROM livros WHERE categoria = ?';




    db.query(query, [category], (err, results) => {
        if (err) {
            console.error('Erro ao obter livros:', err);
            res.status(500).send('Erro ao obter livros');
            return;
        }
        res.json(results);
    });
});




// Rota para processar o login
app.post('/login', (req, res) => {
    const { username, password } = req.body;




    const query = 'SELECT * FROM usuarios WHERE nome = ?';
    db.query(query, [username], (err, results) => {
        if (err) {
            console.error('Erro ao consultar o banco de dados:', err);
            res.status(500).send('Erro ao consultar o banco de dados');
            return;
        }
        if (results.length > 0) {
            const user = results[0];
            bcrypt.compare(password, user.senha, (err, result) => {
                if (result) {
                    res.redirect('/menu');
                } else {
                    res.send('Nome de usuário ou senha incorretos');
                }
            });
        } else {
            // Se o usuário não existe, insirir no banco de dados
            const saltRounds = 10;
            bcrypt.hash(password, saltRounds, (err, hash) => {
                if (err) {
                    console.error('Erro ao criptografar a senha:', err);
                    res.status(500).send('Erro ao criptografar a senha');
                    return;
                }
                const insertQuery = 'INSERT INTO usuarios (nome, senha, email) VALUES (?, ?, ?)';
                db.query(insertQuery, [username, hash, 'email@example.com'], (err, results) => {
                    if (err) {
                        console.error('Erro ao realizar o cadastro:', err);
                        res.status(500).send('Erro ao realizar o cadastro');
                        return;
                    }
                    res.redirect('/menu');
                });
            });
        }
    });
});




// Rota para processar o cadastro de novos usuários
app.post('/register', (req, res) => {
    const { username, password, email } = req.body;




    const query = 'SELECT * FROM usuarios WHERE nome = ?';
    db.query(query, [username], (err, results) => {
        if (err) {
            console.error('Erro ao realizar o cadastro:', err);
            res.status(500).send('Erro ao realizar o cadastro');
            return;
        }
        if (results.length > 0) {
            res.send('Nome de usuário já existe');
        } else {
            const saltRounds = 10;
            bcrypt.hash(password, saltRounds, (err, hash) => {
                if (err) {
                    console.error('Erro ao criptografar a senha:', err);
                    res.status(500).send('Erro ao criptografar a senha');
                    return;
                }
                const insertQuery = 'INSERT INTO usuarios (nome, senha, email) VALUES (?, ?, ?)';
                db.query(insertQuery, [username, hash, email], (err, results) => {
                    if (err) {
                        console.error('Erro ao realizar o cadastro:', err);
                        res.status(500).send('Erro ao realizar o cadastro');
                        return;
                    }
                    res.send('Usuário registrado com sucesso');
                });
            });
        }
    });
});



// Rota para os livros
app.get('/books', (req, res) => {
    res.sendFile(path.join(__dirname, 'livros.html'));
});



// Configuração do Nodemailer para enviar emails
let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    secure: true, // true para 465, false para outras portas, usamos 465 na nossa região
    port: 465,
    auth: {
      user: 'studentookcedup@gmail.com',
      pass: 'djsw jbui mkjn wraz',
    },
  });




// Rota para solicitar recuperação de senha
app.post('/recover', (req, res) => {
    const { email } = req.body;




    const query = 'SELECT * FROM usuarios WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Erro ao requisitar recuperação de senha:', err);
            res.status(500).send('Erro ao requisitar recuperação de senha');
            return;
        }
        if (results.length > 0) {
            const user = results[0];
            const token = crypto.randomBytes(20).toString('hex');




            const expireTime = Date.now() + 3600000; // 1 hora




            const updateQuery = 'UPDATE usuarios SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE email = ?';
            db.query(updateQuery, [token, expireTime, email], (err, results) => {
                if (err) {
                    console.error('Erro ao atualizar token no banco de dados:', err);
                    res.status(500).send('Erro ao atualizar token no banco de dados');
                    return;
                }




                const mailOptions = {
                    to: email,
                    from: 'studentookcedup@gmail.com',
                    subject: 'Recuperação de Senha',
                    text: `Você está recebendo isso porque você (ou alguém mais) solicitou a recuperação da senha da sua conta.\n\n` +
                          `Clique no link a seguir, ou copie e cole no seu navegador para completar o processo:\n\n` +
                          `http://${req.headers.host}/reset/${token}\n\n` +
                          `Se você não solicitou isso, por favor, ignore este email e sua senha permanecerá inalterada.\n`
                };




                transporter.sendMail(mailOptions, (err) => {
                    if (err) {
                        console.error('Erro ao enviar email:', err);
                        res.status(500).send('Erro ao enviar email');
                        return;
                    }
                    res.send('Um email foi enviado para ' + email + ' com mais instruções.');
                });
            });
        } else {
            res.send('Nenhuma conta com esse email foi encontrada.');
        }
    });
});




// Rota para atualizar a senha no banco de dados
app.post('/reset/:token', (req, res) => {
    const { token } = req.params;
    const { password } = req.body;




    const query = 'SELECT * FROM usuarios WHERE resetPasswordToken = ? AND resetPasswordExpires > ?';
    db.query(query, [token, Date.now()], (err, results) => {
        if (err) {
            console.error('Erro ao redefinir senha:', err);
            res.status(500).send('Erro ao redefinir senha');
            return;
        }
        if (results.length > 0) {
            const user = results[0];
            const saltRounds = 10;




            bcrypt.hash(password, saltRounds, (err, hash) => {
                if (err) {
                    console.error('Erro ao criptografar a senha:', err);
                    res.status(500).send('Erro ao criptografar a senha');
                    return;
                }




                const updateQuery = 'UPDATE usuarios SET senha = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE email = ?';
                db.query(updateQuery, [hash, user.email], (err, results) => {
                    if (err) {
                        console.error('Erro ao atualizar a senha no banco de dados:', err);
                        res.status(500).send('Erro ao atualizar a senha no banco de dados');
                        return;
                    }
                    res.send('Senha atualizada com sucesso!');
                });
            });
        } else {
            res.send('Token de recuperação de senha é inválido ou expirou.');
        }
    });
});




// Rota para resetar a senha usando o token
app.get('/reset/:token', (req, res) => {
    const { token } = req.params;

    const query = 'SELECT * FROM usuarios WHERE resetPasswordToken = ? AND resetPasswordExpires > ?';
    db.query(query, [token, Date.now()], (err, results) => {
        if (err) {
            console.error('Erro ao redefinir senha:', err);
            res.status(500).send('Erro ao redefinir senha');
            return;
        }
        if (results.length > 0) {
            console.log('Token válido. Enviando página de resetar senha.');
            res.sendFile(path.join(__dirname, 'resetar_senha.html'));
        } else {
            res.send('Token de recuperação de senha é inválido ou expirou.');
        }
    });
});



// Rota para obter o link do PDF de um livro pelo título
app.get('/api/book-link', (req, res) => {
    const titulo = req.query.titulo;
    const query = 'SELECT pdf FROM livros WHERE titulo = ?';


    db.query(query, [titulo], (err, results) => {
        if (err) {
            console.error('Erro ao obter link do livro:', err);
            res.status(500).send('Erro ao obter link do livro');
            return;
        }
        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).send('Livro não encontrado');
        }
    });
});


// Rota pras atividade
app.get('/activities', (req, res) => {
    res.sendFile(path.join(__dirname, '/atividades.html'));
});
// Rota para a atividade de Conjuntos
app.get('/activity/conjuntos', (req, res) => {
    res.sendFile(path.join(__dirname, 'atividades', 'conjuntos.html'));
});


// Rota para a atividade de Propaganda Política
app.get('/activity/propaganda-politica', (req, res) => {
    res.sendFile(path.join(__dirname, 'atividades', 'propaganda_politica.html'));
});


// Rota para a atividade de Organização Ecológica
app.get('/activity/organizacao-ecologica', (req, res) => {
    res.sendFile(path.join(__dirname, 'atividades', 'organizacao_ecologica.html'));
});


// Rota para a atividade do Hino à Bandeira
app.get('/activity/hino-bandeira', (req, res) => {
    res.sendFile(path.join(__dirname, 'atividades', 'hino_bandeira.html'));
});



// Rota para o formulário de envio de resposta
app.post('/submit-answer', (req, res) => {
    const { userId, atividadeId, answer } = req.body;

    if (!userId || !atividadeId || !answer) {
        return res.status(400).send({
            message: 'Parâmetros insuficientes.',
            style: 'font-family: Comic Sans MS; color: red;'
        });
    }

    // Consulta para verificar a resposta correta
    const query = 'SELECT resposta_correta FROM atividades WHERE id = ?';
    db.query(query, [atividadeId], (err, results) => {
        if (err) {
            console.error('Erro ao consultar a resposta correta:', err);
            return res.status(500).send({
                message: 'Erro ao consultar a resposta correta.',
                style: 'font-family: Comic Sans MS; color: red;'
            });
        }

        if (results.length > 0) {
            const respostaCorreta = results[0].resposta_correta;

            // Verifica se a resposta enviada é a correta
            const pontosGanhados = answer === respostaCorreta ? 10 : 0;

            // Insere a resposta no banco de dados
            const insertAnswerQuery = `
                INSERT INTO respostas_usuario (user_id, atividade_id, resposta_enviada, pontos)
                VALUES (?, ?, ?, ?)
            `;
            db.query(insertAnswerQuery, [userId, atividadeId, answer, pontosGanhados], (err, result) => {
                if (err) {
                    console.error('Erro ao registrar a resposta do usuário:', err);
                    return res.status(500).send({
                        message: 'Erro ao registrar a resposta.',
                        style: 'font-family: Comic Sans MS; color: red;'
                    });
                }

                // Após inserir a resposta, atualizar ou inserir os pontos do usuário
                const checkPointsQuery = `SELECT * FROM pontos WHERE user_id = ?`;
                db.query(checkPointsQuery, [userId], (err, results) => {
                    if (err) {
                        console.error('Erro ao verificar pontos do usuário:', err);
                        return res.status(500).send({
                            message: 'Erro ao verificar pontos.',
                            style: 'font-family: Comic Sans MS; color: red;'
                        });
                    }

                    if (results.length > 0) {
                        // Usuário já tem pontos, atualizar o total
                        const currentPoints = results[0].pontos;
                        const newTotal = currentPoints + pontosGanhados;

                        const updatePointsQuery = `UPDATE pontos SET pontos = ? WHERE user_id = ?`;
                        db.query(updatePointsQuery, [newTotal, userId], (err, result) => {
                            if (err) {
                                console.error('Erro ao atualizar pontos:', err);
                                return res.status(500).send({
                                    message: 'Erro ao atualizar pontos.',
                                    style: 'font-family: Comic Sans MS; color: red;'
                                });
                            }

                            const feedbackMessage = pontosGanhados > 0
                                ? 'Resposta correta! Você ganhou 10 pontos.'
                                : 'Resposta incorreta! Tente novamente.';

                            res.send({
                                message: feedbackMessage,
                                style: 'font-family: Comic Sans MS; color: green;'
                            });
                        });

                    } else {
                        // Usuário não tem pontos, inserir um novo registro
                        const insertPointsQuery = `INSERT INTO pontos (user_id, pontos) VALUES (?, ?)`;
                        db.query(insertPointsQuery, [userId, pontosGanhados], (err, result) => {
                            if (err) {
                                console.error('Erro ao inserir pontos:', err);
                                return res.status(500).send({
                                    message: 'Erro ao inserir pontos.',
                                    style: 'font-family: Comic Sans MS; color: red;'
                                });
                            }

                            const feedbackMessage = pontosGanhados > 0
                                ? 'Resposta correta! Você ganhou 10 pontos.'
                                : 'Resposta incorreta! Tente novamente.';

                            res.send({
                                message: feedbackMessage,
                                style: 'font-family: Comic Sans MS; color: green;'
                            });
                        });
                    }
                });
            });
        } else {
            res.status(404).send({
                message: 'Atividade não encontrada.',
                style: 'font-family: Comic Sans MS; color: red;'
            });
        }
    });
});





app.get('/questao', (req, res) => {
    const userId = req.session.userId; // Obtendo o ID do usuário da sessão
    res.render('questao', { userId: userId }); // Passando userId para a página
});

app.get('/user-session', (req, res) => {
    if (req.session.userId) {
        res.json({ userId: req.session.userId });
    } else {
        res.status(401).json({ message: 'Usuário não autenticado' });
    }
});
 

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'index_jogo.html'));
});

app.get('/store',(req, res) => {
    res.sendFile(path.join(__dirname, 'loja.html'))
});

app.get('/bookStore', (req, res) => {
    res.sendFile(path.join(__dirname, 'loja_livros.html'));
});

app.get('/avatarStore', (req, res) => {
    res.sendFile(path.join(__dirname, 'loja_avatar.html'));
});

app.get('/hairStore', (req, res) => {
    res.sendFile(path.join(__dirname, 'loja_cabelo.html'));
});

app.get('/acessoriesStore', (req, res) => {
    res.sendFile(path.join(__dirname, 'loja_acessorios.html'));
});

app.get('/supliesStore', (req, res) => {
    res.sendFile(path.join(__dirname, 'loja_materiais.html'));
});


// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});