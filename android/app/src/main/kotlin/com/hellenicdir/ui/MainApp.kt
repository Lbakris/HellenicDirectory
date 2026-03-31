package com.hellenicdir.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.*
import androidx.navigation.compose.*
import com.hellenicdir.ui.auth.AuthViewModel
import com.hellenicdir.ui.auth.LoginScreen
import com.hellenicdir.ui.auth.RegisterScreen
import com.hellenicdir.ui.businesses.BusinessListScreen
import com.hellenicdir.ui.designsystem.HDGold
import com.hellenicdir.ui.directories.DirectoryMemberListScreen
import com.hellenicdir.ui.messaging.InboxScreen
import com.hellenicdir.ui.parishes.ParishDetailScreen
import com.hellenicdir.ui.parishes.ParishListScreen
import com.hellenicdir.ui.profile.ProfileScreen

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Register : Screen("register")
    object Parishes : Screen("parishes")
    object ParishDetail : Screen("parish/{id}") {
        fun go(id: String) = "parish/$id"
    }
    object Businesses : Screen("businesses")
    object DirectoryMembers : Screen("directory/{id}") {
        fun go(id: String) = "directory/$id"
    }
    object Inbox : Screen("directory/{id}/inbox") {
        fun go(id: String) = "directory/$id/inbox"
    }
    object Profile : Screen("profile")
}

@Composable
fun MainApp() {
    val authViewModel: AuthViewModel = hiltViewModel()
    val authState by authViewModel.uiState.collectAsState()
    val navController = rememberNavController()
    val currentBackStack by navController.currentBackStackEntryAsState()
    val currentRoute = currentBackStack?.destination?.route

    val isLoggedIn = authState.user != null
    val isAdmin = authState.user?.appRole == "OWNER" || authState.user?.appRole == "ADMIN"

    val bottomNavRoutes = buildList {
        add(Screen.Parishes.route)
        add(Screen.Businesses.route)
        if (isLoggedIn) add(Screen.Profile.route)
    }
    val showBottomBar = currentRoute in bottomNavRoutes

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                    NavigationBarItem(
                        selected = currentRoute == Screen.Parishes.route,
                        onClick = { navController.navigate(Screen.Parishes.route) { launchSingleTop = true } },
                        icon = { Icon(Icons.Default.Place, contentDescription = "Parishes") },
                        label = { Text("Parishes") },
                        colors = NavigationBarItemDefaults.colors(indicatorColor = HDGold.copy(alpha = 0.2f))
                    )
                    NavigationBarItem(
                        selected = currentRoute == Screen.Businesses.route,
                        onClick = { navController.navigate(Screen.Businesses.route) { launchSingleTop = true } },
                        icon = { Icon(Icons.Default.Work, contentDescription = "Businesses") },
                        label = { Text("Businesses") },
                        colors = NavigationBarItemDefaults.colors(indicatorColor = HDGold.copy(alpha = 0.2f))
                    )
                    if (isLoggedIn) {
                        NavigationBarItem(
                            selected = currentRoute == Screen.Profile.route,
                            onClick = { navController.navigate(Screen.Profile.route) { launchSingleTop = true } },
                            icon = { Icon(Icons.Default.Person, contentDescription = "Profile") },
                            label = { Text("Profile") },
                            colors = NavigationBarItemDefaults.colors(indicatorColor = HDGold.copy(alpha = 0.2f))
                        )
                    }
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = if (isLoggedIn) Screen.Parishes.route else Screen.Login.route,
            modifier = Modifier.padding(padding)
        ) {
            composable(Screen.Login.route) {
                LoginScreen(
                    onLoginSuccess = {
                        navController.navigate(Screen.Parishes.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    },
                    onNavigateToRegister = { navController.navigate(Screen.Register.route) }
                )
            }
            composable(Screen.Register.route) {
                RegisterScreen(onRegistered = { navController.popBackStack() })
            }
            composable(Screen.Parishes.route) {
                ParishListScreen(onParishClick = { id -> navController.navigate(Screen.ParishDetail.go(id)) })
            }
            composable(Screen.ParishDetail.route) { back ->
                ParishDetailScreen(parishId = back.arguments?.getString("id") ?: "")
            }
            composable(Screen.Businesses.route) {
                BusinessListScreen()
            }
            composable(Screen.DirectoryMembers.route) { back ->
                DirectoryMemberListScreen(
                    directoryId = back.arguments?.getString("id") ?: "",
                    onOpenInbox = { id -> navController.navigate(Screen.Inbox.go(id)) }
                )
            }
            composable(Screen.Inbox.route) { back ->
                InboxScreen(directoryId = back.arguments?.getString("id") ?: "")
            }
            composable(Screen.Profile.route) {
                ProfileScreen(
                    onLogout = {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                )
            }
        }
    }
}
