FROM mysql:8.0.36

USER root

RUN mkdir -p /var/lib/mysql /var/run/mysqld  /var/log/mysql\
 && chown -R mysql:mysql /var/lib/mysql /var/run/mysqld /var/log/mysql

COPY ./my.cnf /etc/mysql/conf.d/my.cnf
RUN chmod 644 /etc/mysql/conf.d/my.cnf

USER mysql