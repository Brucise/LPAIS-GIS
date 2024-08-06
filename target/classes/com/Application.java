package com;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/*
    1. 创建主程序入口，并声明这是一个SpringBoot应用
 */
@MapperScan("com.mapper")
@SpringBootApplication
public class Application {
    /*
        2. 编写main方法，
     */
    public static void main(String[] args) {
        /*
            3. 开始启动主程序类
        */
        SpringApplication.run(Application.class, args);
    }
}
