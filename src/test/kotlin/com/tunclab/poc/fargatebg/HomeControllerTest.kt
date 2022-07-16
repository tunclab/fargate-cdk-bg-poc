package com.tunclab.poc.fargatebg

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@WebMvcTest(HomeController::class)
class HomeControllerTest(@Autowired val mockMvc: MockMvc) {

    @Test
    fun `ping endpoint is working`() {
        mockMvc.get("/ping")
                .andExpect {
                    status { isOk() }
                }
    }
}