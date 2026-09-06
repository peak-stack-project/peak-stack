package school.sptech;

import java.util.Scanner;

public class IndividualHelena {

        public static void main(String[] args) {

            Scanner scanner = new Scanner(System.in);

            String nome;
            Integer anoNascimento;
            String email;
            String nomeEmpresa;
            String senha;
            String repeticaoSenha;


            do {
                System.out.print("Digite seu nome: ");
                nome = scanner.nextLine();

                if (nome.length() <= 2) {
                    System.out.println("Nome inválido!");
                }

            } while (nome.length() < 2);


            do {
                System.out.print("Digite seu ano de nascimento: ");
                anoNascimento = scanner.nextInt();

                if (2026 - anoNascimento < 18) {
                    System.out.println("Você precisa ser maior de idade!");
                }

            } while (2026 - anoNascimento < 18);


            scanner.nextLine();



            do {
                System.out.print("Digite seu e-mail: ");
                email = scanner.nextLine();

                if (!email.contains("@") || !email.contains(".")) {
                    System.out.println("E-mail inválido!");
                }

            } while (!email.contains("@") || !email.contains("."));

            System.out.println("Digite o nome da empresa em que trabalha: ");
            nomeEmpresa = scanner.nextLine();

            do {
                System.out.print("Digite sua senha: ");
                senha = scanner.nextLine();

                if (senha.length() < 6) {
                    System.out.println("A senha deve ter pelo menos 6 caracteres!");
                }
                if (!senha.contains("@") && !senha.contains("&") && !senha.contains("#") &&
                        !senha.contains("$") && !senha.contains("!") && !senha.contains("%")) {
                    System.out.println("A senha deve ter pelo menos 1 caracter especial!");
                }


            } while (senha.length() < 6 || !senha.contains("@") && !senha.contains("&") && !senha.contains("#") &&
                    !senha.contains("$") && !senha.contains("!") && !senha.contains("%"));

            do {
                System.out.println("Repita a sua senha: ");
                repeticaoSenha = scanner.nextLine();

                if(!repeticaoSenha.equals(senha)){
                    System.out.println("Senha diferente!");
                }
            } while (!repeticaoSenha.equals(senha));

            System.out.println("\n===== CADASTRO REALIZADO =====");
            System.out.println("Nome: " + nome);
            System.out.println("Idade: " + (2026 - anoNascimento));
            System.out.println("E-mail: " + email);
            System.out.println("Empresa: " + nomeEmpresa);

            scanner.close();
        }
    }
