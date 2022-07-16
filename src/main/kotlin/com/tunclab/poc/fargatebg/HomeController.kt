package com.tunclab.poc.fargatebg

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class HomeController {

    @GetMapping("/ping")
    fun ping(): String {
        return "I am still live."
    }
}